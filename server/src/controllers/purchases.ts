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

async function adjustStock(items: { skuId: number; quantity: number }[], direction: 1 | -1) {
  for (const item of items) {
    await prisma.sKU.update({
      where: { id: item.skuId },
      data: { currentStock: { increment: item.quantity * direction } },
    });
  }
}

export async function getPurchases(req: Request, res: Response, next: NextFunction) {
  try {
    const { merchantId, status, page = '1', limit = '20' } = req.query;
    const where: Record<string, unknown> = {};
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
    const purchase = await prisma.purchase.findUniqueOrThrow({ where: { id: Number(req.params.id) }, include: purchaseInclude });
    res.json(purchase);
  } catch (err) { next(err); }
}

export async function createPurchase(req: Request, res: Response, next: NextFunction) {
  try {
    const { items, ...rest } = purchaseSchema.parse(req.body);
    const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

    const purchase = await prisma.$transaction(async (tx) => {
      const created = await tx.purchase.create({
        data: {
          ...rest,
          date: rest.date ? new Date(rest.date) : new Date(),
          totalAmount,
          items: {
            create: items.map(i => ({
              skuId: i.skuId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              totalPrice: i.quantity * i.unitPrice,
            })),
          },
        },
        include: purchaseInclude,
      });

      if (rest.status === 'COMPLETED') {
        for (const item of items) {
          await tx.sKU.update({
            where: { id: item.skuId },
            data: { currentStock: { increment: item.quantity } },
          });
        }
      }
      return created;
    });

    res.status(201).json(purchase);
  } catch (err) { next(err); }
}

export async function updatePurchase(req: Request, res: Response, next: NextFunction) {
  try {
    const { items, ...rest } = purchaseSchema.partial().parse(req.body);
    const existing = await prisma.purchase.findUniqueOrThrow({
      where: { id: Number(req.params.id) },
      include: { items: true },
    });

    const purchase = await prisma.$transaction(async (tx) => {
      // Reverse old stock effect if was COMPLETED
      if (existing.status === 'COMPLETED') {
        for (const item of existing.items) {
          await tx.sKU.update({
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

      const updated = await tx.purchase.update({
        where: { id: Number(req.params.id) },
        data: {
          ...rest,
          ...(rest.date ? { date: new Date(rest.date) } : {}),
          totalAmount,
          ...(items ? {
            items: {
              deleteMany: {},
              create: items.map(i => ({
                skuId: i.skuId,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                totalPrice: i.quantity * i.unitPrice,
              })),
            },
          } : {}),
        },
        include: purchaseInclude,
      });

      // Apply new stock effect if now COMPLETED
      if (newStatus === 'COMPLETED') {
        for (const item of newItems) {
          await tx.sKU.update({
            where: { id: item.skuId },
            data: { currentStock: { increment: item.quantity } },
          });
        }
      }
      return updated;
    });

    res.json(purchase);
  } catch (err) { next(err); }
}

export async function deletePurchase(req: Request, res: Response, next: NextFunction) {
  try {
    const existing = await prisma.purchase.findUniqueOrThrow({
      where: { id: Number(req.params.id) },
      include: { items: true },
    });

    await prisma.$transaction(async (tx) => {
      if (existing.status === 'COMPLETED') {
        for (const item of existing.items) {
          await tx.sKU.update({
            where: { id: item.skuId },
            data: { currentStock: { decrement: Number(item.quantity) } },
          });
        }
      }
      await tx.purchase.delete({ where: { id: Number(req.params.id) } });
    });

    res.status(204).send();
  } catch (err) { next(err); }
}
