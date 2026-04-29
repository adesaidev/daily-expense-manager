import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';

const expenseSchema = z.object({
  amount: z.number().positive(),
  description: z.string().min(1),
  date: z.string().datetime(),
  categoryId: z.number().int().positive(),
  merchantId: z.number().int().positive().optional().nullable(),
  paymentStatus: z.enum(['PENDING', 'COMPLETED']).optional(),
  paymentType: z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'CARD']).optional().nullable(),
  isRecurring: z.boolean().optional(),
  recurringId: z.number().int().optional(),
});

const expenseInclude = { category: true, merchant: true };

export async function getExpenses(req: Request, res: Response, next: NextFunction) {
  try {
    const { month, year, day, startDate, endDate, categoryId, merchantId, paymentStatus, paymentType, page = '1', limit = '50' } = req.query;

    const where: Record<string, unknown> = {};

    if (startDate && endDate) {
      // Explicit date range from calendar picker
      const start = new Date(String(startDate));
      const end = new Date(String(endDate));
      end.setHours(23, 59, 59, 999);
      where.date = { gte: start, lte: end };
    } else if (startDate) {
      // Single day via calendar
      const start = new Date(String(startDate));
      const end = new Date(String(startDate));
      end.setHours(23, 59, 59, 999);
      where.date = { gte: start, lte: end };
    } else if (day && month && year) {
      const start = new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0);
      const end = new Date(Number(year), Number(month) - 1, Number(day), 23, 59, 59);
      where.date = { gte: start, lte: end };
    } else if (month && year) {
      const start = new Date(Number(year), Number(month) - 1, 1);
      const end = new Date(Number(year), Number(month), 0, 23, 59, 59);
      where.date = { gte: start, lte: end };
    } else if (year) {
      const start = new Date(Number(year), 0, 1);
      const end = new Date(Number(year), 11, 31, 23, 59, 59);
      where.date = { gte: start, lte: end };
    }

    if (categoryId) where.categoryId = Number(categoryId);
    if (merchantId) where.merchantId = Number(merchantId);
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (paymentType) where.paymentType = paymentType;

    const skip = (Number(page) - 1) * Number(limit);
    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: expenseInclude,
        orderBy: { date: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.expense.count({ where }),
    ]);

    res.json({ data: expenses, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
}

export async function createExpense(req: Request, res: Response, next: NextFunction) {
  try {
    const data = expenseSchema.parse(req.body);
    const expense = await prisma.expense.create({
      data: { ...data, date: new Date(data.date) },
      include: expenseInclude,
    });
    res.status(201).json(expense);
  } catch (err) {
    next(err);
  }
}

export async function updateExpense(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const data = expenseSchema.partial().parse(req.body);
    const expense = await prisma.expense.update({
      where: { id: Number(id) },
      data: { ...data, ...(data.date ? { date: new Date(data.date) } : {}) },
      include: expenseInclude,
    });
    res.json(expense);
  } catch (err) {
    next(err);
  }
}

export async function deleteExpense(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    await prisma.expense.delete({ where: { id: Number(id) } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function exportExpenses(req: Request, res: Response, next: NextFunction) {
  try {
    const { month, year } = req.query;
    const where: Record<string, unknown> = {};

    if (month && year) {
      const start = new Date(Number(year), Number(month) - 1, 1);
      const end = new Date(Number(year), Number(month), 0, 23, 59, 59);
      where.date = { gte: start, lte: end };
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: expenseInclude,
      orderBy: { date: 'desc' },
    });

    const rows = expenses.map(e => ({
      Date: e.date.toISOString().slice(0, 10),
      Description: e.description,
      Category: e.category.name,
      Merchant: e.merchant?.name ?? '',
      Amount: Number(e.amount).toFixed(2),
      PaymentType: e.paymentType?.replace('_', ' ') ?? '',
      PaymentStatus: e.paymentStatus,
      Recurring: e.isRecurring ? 'Yes' : 'No',
      BillImage: e.billImagePath ?? '',
    }));

    const headers = Object.keys(rows[0] || {});
    const csv = [
      headers.join(','),
      ...rows.map(r => headers.map(h => `"${(r as Record<string, string>)[h]}"`).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=expenses.csv');
    res.send(csv);
  } catch (err) {
    next(err);
  }
}
