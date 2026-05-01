import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

function userWhere(req: Request) {
  return req.user!.role === 'ADMIN' ? {} : { userId: req.user!.uid };
}

export async function getMonthlySummary(req: Request, res: Response, next: NextFunction) {
  try {
    const { year = new Date().getFullYear() } = req.query;

    const start = new Date(Number(year), 0, 1);
    const end = new Date(Number(year), 11, 31, 23, 59, 59);

    const expenses = await prisma.expense.findMany({
      where: { date: { gte: start, lte: end }, ...userWhere(req) },
      include: { category: true },
    });

    const monthly: Record<number, number> = {};
    for (let m = 1; m <= 12; m++) monthly[m] = 0;

    expenses.forEach(e => {
      const month = new Date(e.date).getMonth() + 1;
      monthly[month] = (monthly[month] || 0) + Number(e.amount);
    });

    const result = Object.entries(monthly).map(([month, total]) => ({
      month: Number(month),
      total: Number(total.toFixed(2)),
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getCategoryBreakdown(req: Request, res: Response, next: NextFunction) {
  try {
    const { month, year } = req.query;
    const where: Record<string, unknown> = { ...userWhere(req) };

    if (month && year) {
      const start = new Date(Number(year), Number(month) - 1, 1);
      const end = new Date(Number(year), Number(month), 0, 23, 59, 59);
      where.date = { gte: start, lte: end };
    }

    const result = await prisma.expense.groupBy({
      by: ['categoryId'],
      where,
      _sum: { amount: true },
      _count: true,
    });

    const categories = await prisma.category.findMany({
      where: { id: { in: result.map(r => r.categoryId) }, ...userWhere(req) },
    });

    const catMap = Object.fromEntries(categories.map(c => [c.id, c]));

    const breakdown = result.map(r => ({
      categoryId: r.categoryId,
      category: catMap[r.categoryId],
      total: Number(r._sum.amount?.toFixed(2) ?? 0),
      count: r._count,
    }));

    res.json(breakdown);
  } catch (err) {
    next(err);
  }
}

export async function getDashboardStats(req: Request, res: Response, next: NextFunction) {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const uw = userWhere(req);

    const [thisMonth, lastMonth, totalExpenses, topCategory] = await Promise.all([
      prisma.expense.aggregate({
        where: { date: { gte: monthStart, lte: monthEnd }, ...uw },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.expense.aggregate({
        where: { date: { gte: prevMonthStart, lte: prevMonthEnd }, ...uw },
        _sum: { amount: true },
      }),
      prisma.expense.count({ where: uw }),
      prisma.expense.groupBy({
        by: ['categoryId'],
        where: { date: { gte: monthStart, lte: monthEnd }, ...uw },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 1,
      }),
    ]);

    let topCategoryName = null;
    if (topCategory.length > 0) {
      const cat = await prisma.category.findFirst({
        where: { id: topCategory[0].categoryId, ...uw },
      });
      topCategoryName = cat?.name ?? null;
    }

    const thisMonthTotal = Number(thisMonth._sum.amount ?? 0);
    const lastMonthTotal = Number(lastMonth._sum.amount ?? 0);
    const change = lastMonthTotal === 0 ? 0 : ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100;

    res.json({
      thisMonthTotal: Number(thisMonthTotal.toFixed(2)),
      lastMonthTotal: Number(lastMonthTotal.toFixed(2)),
      changePercent: Number(change.toFixed(1)),
      thisMonthCount: thisMonth._count,
      totalExpenses,
      topCategory: topCategoryName,
    });
  } catch (err) {
    next(err);
  }
}
