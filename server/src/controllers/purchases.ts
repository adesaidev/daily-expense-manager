import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';

const itemSchema = z.object({
  skuId: z.number().int().positive(),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
});

const purchaseSchema = z.object({
  merchantId: z.number().int().positive().optional().nullable(),
  date: z.string().datetime().optional(),
  notes: z.string().optional().nullable(),
  status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED']).default('COMPLETED'),
  items: z.array(itemSchema).min(1),
});

const purchaseInclude = {
  merchant: true,
  items: { include: { sku: true } },
};

function userWhere(req: Request) {
  return req.user!.role === 'ADMIN' ? {} : { userId: req.user!.uid };
}

export async function getPurchases(req: Request, res: Response, next: NextFunction) {
  try {
    const { merchantId, status, page = '1', limit = '20' } = req.query;
    const where: Record<string, unknown> = { ...userWhere(req) };
    if (merchantId) where.merchantId = Number(merchantId);
    if (status) where.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [purchases, total] = await Promise.all([
      prisma.purchase.findMany({ where, include: purchaseInclude, orderBy: { date: 'desc' }, skip, take: Number(limit) }),
      prisma.purchase.count({ where }),
    ]);
    res.json({ data: purchases, total, page: Number(page), limit: Number(limit) });
  } catch (err) { next(err); }
}

export async function getPurchase(req: Request, res: Response, next: NextFunction) {
  try {
    const purchase = await prisma.purchase.findFirstOrThrow({
      where: { id: Number(req.params.id), ...userWhere(req) },
      include: purchaseInclude,
    });
    res.json(purchase);
  } catch (err) { next(err); }
}

export async function createPurchase(req: Request, res: Response, next: NextFunction) {
  try {
    const { items, ...rest } = purchaseSchema.parse(req.body);
    const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

    // Create purchase without nested items to avoid implicit transaction
    const purchase = await prisma.purchase.create({
      data: {
        merchantId: rest.merchantId ?? null,
        date: rest.date ? new Date(rest.date) : new Date(),
        totalAmount,
        notes: rest.notes ?? null,
        status: rest.status,
        userId: req.user!.uid,
      },
    });

    // Create items one by one
    for (const item of items) {
      await prisma.purchaseItem.create({
        data: {
          purchaseId: purchase.id,
          skuId: item.skuId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice,
        },
      });
    }

    // Adjust stock
    if (rest.status === 'COMPLETED') {
      for (const item of items) {
        await prisma.sKU.update({
          where: { id: item.skuId },
          data: { currentStock: { increment: item.quantity } },
        });
      }
    }

    const result = await prisma.purchase.findUniqueOrThrow({
      where: { id: purchase.id },
      include: purchaseInclude,
    });
    res.status(201).json(result);
  } catch (err) { next(err); }
}

export async function updatePurchase(req: Request, res: Response, next: NextFunction) {
  try {
    const { items, ...rest } = purchaseSchema.partial().parse(req.body);
    const existing = await prisma.purchase.findFirstOrThrow({
      where: { id: Number(req.params.id), ...userWhere(req) },
      include: { items: true },
    });

    // Reverse old stock if was COMPLETED
    if (existing.status === 'COMPLETED') {
      for (const item of existing.items) {
        await prisma.sKU.update({
          where: { id: item.skuId },
          data: { currentStock: { decrement: Number(item.quantity) } },
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

    // Update purchase fields only (no nested writes)
    await prisma.purchase.update({
      where: { id: Number(req.params.id) },
      data: {
        ...(rest.merchantId !== undefined ? { merchantId: rest.merchantId } : {}),
        ...(rest.date ? { date: new Date(rest.date) } : {}),
        ...(rest.notes !== undefined ? { notes: rest.notes } : {}),
        ...(rest.status ? { status: rest.status } : {}),
        totalAmount,
      },
    });

    // Replace items if provided
    if (items) {
      await prisma.purchaseItem.deleteMany({ where: { purchaseId: Number(req.params.id) } });
      for (const item of items) {
        await prisma.purchaseItem.create({
          data: {
            purchaseId: Number(req.params.id),
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
          data: { currentStock: { increment: item.quantity } },
        });
      }
    }

    const result = await prisma.purchase.findUniqueOrThrow({
      where: { id: Number(req.params.id) },
      include: purchaseInclude,
    });
    res.json(result);
  } catch (err) { next(err); }
}

export async function deletePurchase(req: Request, res: Response, next: NextFunction) {
  try {
    const existing = await prisma.purchase.findFirstOrThrow({
      where: { id: Number(req.params.id), ...userWhere(req) },
      include: { items: true },
    });

    if (existing.status === 'COMPLETED') {
      for (const item of existing.items) {
        await prisma.sKU.update({
          where: { id: item.skuId },
          data: { currentStock: { decrement: Number(item.quantity) } },
        });
      }
    }

    await prisma.purchase.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  } catch (err) { next(err); }
}
