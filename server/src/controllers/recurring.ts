import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';

const recurringSchema = z.object({
  amount: z.number().positive(),
  description: z.string().min(1),
  categoryId: z.number().int().positive(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
});

function userWhere(req: Request) {
  return req.user!.role === 'ADMIN' ? {} : { userId: req.user!.uid };
}

export async function getRecurring(req: Request, res: Response, next: NextFunction) {
  try {
    const recurring = await prisma.recurring.findMany({
      where: userWhere(req),
      include: { expenses: { orderBy: { date: 'desc' }, take: 1 } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(recurring);
  } catch (err) {
    next(err);
  }
}

export async function createRecurring(req: Request, res: Response, next: NextFunction) {
  try {
    const data = recurringSchema.parse(req.body);
    const recurring = await prisma.recurring.create({
      data: {
        ...data,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        userId: req.user!.uid,
      },
    });
    res.status(201).json(recurring);
  } catch (err) {
    next(err);
  }
}

export async function updateRecurring(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const data = recurringSchema.partial().parse(req.body);
    const recurring = await prisma.recurring.update({
      where: { id: Number(id), ...userWhere(req) },
      data: {
        ...data,
        ...(data.startDate ? { startDate: new Date(data.startDate) } : {}),
        ...(data.endDate ? { endDate: new Date(data.endDate) } : {}),
      },
    });
    res.json(recurring);
  } catch (err) {
    next(err);
  }
}

export async function deleteRecurring(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    await prisma.recurring.delete({ where: { id: Number(id), ...userWhere(req) } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function processRecurring(req: Request, res: Response, next: NextFunction) {
  try {
    const now = new Date();
    const actives = await prisma.recurring.findMany({
      where: { isActive: true, startDate: { lte: now }, ...userWhere(req) },
    });

    let created = 0;
    for (const r of actives) {
      if (r.endDate && r.endDate < now) continue;

      const lastRun = r.lastRun ?? r.startDate;
      const nextRun = getNextRun(lastRun, r.frequency);

      if (nextRun <= now) {
        await prisma.expense.create({
          data: {
            amount: r.amount,
            description: r.description,
            date: nextRun,
            categoryId: r.categoryId,
            isRecurring: true,
            recurringId: r.id,
            userId: r.userId,
          },
        });
        await prisma.recurring.update({
          where: { id: r.id },
          data: { lastRun: nextRun },
        });
        created++;
      }
    }

    res.json({ processed: actives.length, created });
  } catch (err) {
    next(err);
  }
}

function getNextRun(last: Date, frequency: string): Date {
  const d = new Date(last);
  switch (frequency) {
    case 'DAILY': d.setDate(d.getDate() + 1); break;
    case 'WEEKLY': d.setDate(d.getDate() + 7); break;
    case 'MONTHLY': d.setMonth(d.getMonth() + 1); break;
    case 'YEARLY': d.setFullYear(d.getFullYear() + 1); break;
  }
  return d;
}
