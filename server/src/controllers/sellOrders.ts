import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';

const itemSchema = z.object({
  skuId: z.number().int().positive(),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
});

const sellOrderSchema = z.object({
  customerName: z.string().optional().nullable(),
  date: z.string().datetime().optional(),
  notes: z.string().optional().nullable(),
  status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED']).default('COMPLETED'),
  items: z.array(itemSchema).min(1),
});

const sellOrderInclude = {
  items: { include: { sku: true } },
};

function userWhere(req: Request) {
  return req.user!.role === 'ADMIN' ? {} : { userId: req.user!.uid };
}

export async function getSellOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    const where: Record<string, unknown> = { ...userWhere(req) };
    if (status) where.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [orders, total] = await Promise.all([
      prisma.sellOrder.findMany({ where, include: sellOrderInclude, orderBy: { date: 'desc' }, skip, take: Number(limit) }),
      prisma.sellOrder.count({ where }),
    ]);
    res.json({ data: orders, total, page: Number(page), limit: Number(limit) });
  } catch (err) { next(err); }
}

export async function getSellOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const order = await prisma.sellOrder.findFirstOrThrow({
      where: { id: Number(req.params.id), ...userWhere(req) },
      include: sellOrderInclude,
    });
    res.json(order);
  } catch (err) { next(err); }
}

export async function createSellOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const { items, ...rest } = sellOrderSchema.parse(req.body);
    const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

    // Validate stock before creating
    if (rest.status === 'COMPLETED') {
      for (const item of items) {
        const sku = await prisma.sKU.findUniqueOrThrow({ where: { id: item.skuId } });
        if (Number(sku.currentStock) < item.quantity) {
          throw new Error(`Insufficient stock for "${sku.name}": available ${sku.currentStock}, requested ${item.quantity}`);
        }
      }
    }

    // Create sell order without nested items
    const order = await prisma.sellOrder.create({
      data: {
        customerName: rest.customerName ?? null,
        date: rest.date ? new Date(rest.date) : new Date(),
        totalAmount,
        notes: rest.notes ?? null,
        status: rest.status,
        userId: req.user!.uid,
      },
    });

    // Create items one by one
    for (const item of items) {
      await prisma.sellOrderItem.create({
        data: {
          sellOrderId: order.id,
          skuId: item.skuId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice,
        },
      });
    }

    // Deduct stock
    if (rest.status === 'COMPLETED') {
      for (const item of items) {
        await prisma.sKU.update({
          where: { id: item.skuId },
          data: { currentStock: { decrement: item.quantity } },
        });
      }
    }

    const result = await prisma.sellOrder.findUniqueOrThrow({
      where: { id: order.id },
      include: sellOrderInclude,
    });
    res.status(201).json(result);
  } catch (err) { next(err); }
}

export async function updateSellOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const { items, ...rest } = sellOrderSchema.partial().parse(req.body);
    const existing = await prisma.sellOrder.findFirstOrThrow({
      where: { id: Number(req.params.id), ...userWhere(req) },
      include: { items: true },
    });

    // Reverse old stock if was COMPLETED
    if (existing.status === 'COMPLETED') {
      for (const item of existing.items) {
        await prisma.sKU.update({
          where: { id: item.skuId },
          data: { currentStock: { increment: Number(item.quantity) } },
        });
      }
    }

    const newItems = items ?? existing.items.map(i => ({
      skuId: i.skuId,
      quantity: Number(i.quantity),
      unitPrice: Number(i.unitPrice),
    }));
    const totalAmount = newItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const newStatus = rest.status ?? existing.status;

    // Validate stock for new COMPLETED status
    if (newStatus === 'COMPLETED') {
      for (const item of newItems) {
        const sku = await prisma.sKU.findUniqueOrThrow({ where: { id: item.skuId } });
        if (Number(sku.currentStock) < item.quantity) {
          throw new Error(`Insufficient stock for "${sku.name}": available ${sku.currentStock}, requested ${item.quantity}`);
        }
      }
    }

    // Update order fields only (no nested writes)
    await prisma.sellOrder.update({
      where: { id: Number(req.params.id) },
      data: {
        ...(rest.customerName !== undefined ? { customerName: rest.customerName } : {}),
        ...(rest.date ? { date: new Date(rest.date) } : {}),
        ...(rest.notes !== undefined ? { notes: rest.notes } : {}),
        ...(rest.status ? { status: rest.status } : {}),
        totalAmount,
      },
    });

    // Replace items if provided
    if (items) {
      await prisma.sellOrderItem.deleteMany({ where: { sellOrderId: Number(req.params.id) } });
      for (const item of items) {
        await prisma.sellOrderItem.create({
          data: {
            sellOrderId: Number(req.params.id),
            skuId: item.skuId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
          },
        });
      }
    }

    // Apply new stock
    if (newStatus === 'COMPLETED') {
      for (const item of newItems) {
        await prisma.sKU.update({
          where: { id: item.skuId },
          data: { currentStock: { decrement: item.quantity } },
        });
      }
    }

    const result = await prisma.sellOrder.findUniqueOrThrow({
      where: { id: Number(req.params.id) },
      include: sellOrderInclude,
    });
    res.json(result);
  } catch (err) { next(err); }
}

export async function deleteSellOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const existing = await prisma.sellOrder.findFirstOrThrow({
      where: { id: Number(req.params.id), ...userWhere(req) },
      include: { items: true },
    });

    if (existing.status === 'COMPLETED') {
      for (const item of existing.items) {
        await prisma.sKU.update({
          where: { id: item.skuId },
          data: { currentStock: { increment: Number(item.quantity) } },
        });
      }
    }

    await prisma.sellOrder.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  } catch (err) { next(err); }
}
