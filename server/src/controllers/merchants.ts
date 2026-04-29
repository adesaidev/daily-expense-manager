import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';

const merchantSchema = z.object({
  name: z.string().min(1),
  website: z.string().url().optional().or(z.literal('')),
  logo: z.string().optional(),
  categoryId: z.number().int().positive().optional().nullable(),
});

export async function getMerchants(_req: Request, res: Response, next: NextFunction) {
  try {
    const merchants = await prisma.merchant.findMany({
      include: {
        _count: { select: { expenses: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json(merchants);
  } catch (err) {
    next(err);
  }
}

export async function getMerchant(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const merchant = await prisma.merchant.findUnique({
      where: { id: Number(id) },
      include: {
        _count: { select: { expenses: true } },
        expenses: {
          include: { category: true },
          orderBy: { date: 'desc' },
          take: 10,
        },
      },
    });
    if (!merchant) return res.status(404).json({ error: 'Merchant not found' });
    res.json(merchant);
  } catch (err) {
    next(err);
  }
}

export async function createMerchant(req: Request, res: Response, next: NextFunction) {
  try {
    const data = merchantSchema.parse(req.body);
    const merchant = await prisma.merchant.create({ data });
    res.status(201).json(merchant);
  } catch (err) {
    next(err);
  }
}

export async function updateMerchant(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const data = merchantSchema.partial().parse(req.body);
    const merchant = await prisma.merchant.update({
      where: { id: Number(id) },
      data,
    });
    res.json(merchant);
  } catch (err) {
    next(err);
  }
}

export async function deleteMerchant(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    // Unlink expenses before deleting
    await prisma.expense.updateMany({
      where: { merchantId: Number(id) },
      data: { merchantId: null },
    });
    await prisma.merchant.delete({ where: { id: Number(id) } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function getMerchantBreakdown(req: Request, res: Response, next: NextFunction) {
  try {
    const { month, year } = req.query;
    const where: Record<string, unknown> = { merchantId: { not: null } };

    if (month && year) {
      const start = new Date(Number(year), Number(month) - 1, 1);
      const end = new Date(Number(year), Number(month), 0, 23, 59, 59);
      where.date = { gte: start, lte: end };
    }

    const result = await prisma.expense.groupBy({
      by: ['merchantId'],
      where,
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
    });

    const merchantIds = result.map(r => r.merchantId!).filter(Boolean);
    const merchants = await prisma.merchant.findMany({ where: { id: { in: merchantIds } } });
    const merchantMap = Object.fromEntries(merchants.map(m => [m.id, m]));

    const breakdown = result.map(r => ({
      merchantId: r.merchantId,
      merchant: merchantMap[r.merchantId!],
      total: Number(r._sum.amount?.toFixed(2) ?? 0),
      count: r._count,
    }));

    res.json(breakdown);
  } catch (err) {
    next(err);
  }
}
