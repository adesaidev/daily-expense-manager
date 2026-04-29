"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMonthlySummary = getMonthlySummary;
exports.getCategoryBreakdown = getCategoryBreakdown;
exports.getDashboardStats = getDashboardStats;
const prisma_1 = __importDefault(require("../lib/prisma"));
async function getMonthlySummary(req, res, next) {
    try {
        const { year = new Date().getFullYear() } = req.query;
        const start = new Date(Number(year), 0, 1);
        const end = new Date(Number(year), 11, 31, 23, 59, 59);
        const expenses = await prisma_1.default.expense.findMany({
            where: { date: { gte: start, lte: end } },
            include: { category: true },
        });
        // Group by month
        const monthly = {};
        for (let m = 1; m <= 12; m++)
            monthly[m] = 0;
        expenses.forEach(e => {
            const month = new Date(e.date).getMonth() + 1;
            monthly[month] = (monthly[month] || 0) + Number(e.amount);
        });
        const result = Object.entries(monthly).map(([month, total]) => ({
            month: Number(month),
            total: Number(total.toFixed(2)),
        }));
        res.json(result);
    }
    catch (err) {
        next(err);
    }
}
async function getCategoryBreakdown(req, res, next) {
    try {
        const { month, year } = req.query;
        const where = {};
        if (month && year) {
            const start = new Date(Number(year), Number(month) - 1, 1);
            const end = new Date(Number(year), Number(month), 0, 23, 59, 59);
            where.date = { gte: start, lte: end };
        }
        const result = await prisma_1.default.expense.groupBy({
            by: ['categoryId'],
            where,
            _sum: { amount: true },
            _count: true,
        });
        const categories = await prisma_1.default.category.findMany({
            where: { id: { in: result.map(r => r.categoryId) } },
        });
        const catMap = Object.fromEntries(categories.map(c => [c.id, c]));
        const breakdown = result.map(r => ({
            categoryId: r.categoryId,
            category: catMap[r.categoryId],
            total: Number(r._sum.amount?.toFixed(2) ?? 0),
            count: r._count,
        }));
        res.json(breakdown);
    }
    catch (err) {
        next(err);
    }
}
async function getDashboardStats(req, res, next) {
    try {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        const [thisMonth, lastMonth, totalExpenses, topCategory] = await Promise.all([
            prisma_1.default.expense.aggregate({
                where: { date: { gte: monthStart, lte: monthEnd } },
                _sum: { amount: true },
                _count: true,
            }),
            prisma_1.default.expense.aggregate({
                where: { date: { gte: prevMonthStart, lte: prevMonthEnd } },
                _sum: { amount: true },
            }),
            prisma_1.default.expense.count(),
            prisma_1.default.expense.groupBy({
                by: ['categoryId'],
                where: { date: { gte: monthStart, lte: monthEnd } },
                _sum: { amount: true },
                orderBy: { _sum: { amount: 'desc' } },
                take: 1,
            }),
        ]);
        let topCategoryName = null;
        if (topCategory.length > 0) {
            const cat = await prisma_1.default.category.findUnique({ where: { id: topCategory[0].categoryId } });
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
    }
    catch (err) {
        next(err);
    }
}
