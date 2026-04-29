"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExpenses = getExpenses;
exports.createExpense = createExpense;
exports.updateExpense = updateExpense;
exports.deleteExpense = deleteExpense;
exports.exportExpenses = exportExpenses;
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../lib/prisma"));
const expenseSchema = zod_1.z.object({
    amount: zod_1.z.number().positive(),
    description: zod_1.z.string().min(1),
    date: zod_1.z.string().datetime(),
    categoryId: zod_1.z.number().int().positive(),
    merchantId: zod_1.z.number().int().positive().optional().nullable(),
    paymentStatus: zod_1.z.enum(['PENDING', 'COMPLETED']).optional(),
    paymentType: zod_1.z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'CARD']).optional().nullable(),
    isRecurring: zod_1.z.boolean().optional(),
    recurringId: zod_1.z.number().int().optional(),
});
const expenseInclude = { category: true, merchant: true };
async function getExpenses(req, res, next) {
    try {
        const { month, year, day, startDate, endDate, categoryId, merchantId, paymentStatus, paymentType, page = '1', limit = '50' } = req.query;
        const where = {};
        if (startDate && endDate) {
            // Explicit date range from calendar picker
            const start = new Date(String(startDate));
            const end = new Date(String(endDate));
            end.setHours(23, 59, 59, 999);
            where.date = { gte: start, lte: end };
        }
        else if (startDate) {
            // Single day via calendar
            const start = new Date(String(startDate));
            const end = new Date(String(startDate));
            end.setHours(23, 59, 59, 999);
            where.date = { gte: start, lte: end };
        }
        else if (day && month && year) {
            const start = new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0);
            const end = new Date(Number(year), Number(month) - 1, Number(day), 23, 59, 59);
            where.date = { gte: start, lte: end };
        }
        else if (month && year) {
            const start = new Date(Number(year), Number(month) - 1, 1);
            const end = new Date(Number(year), Number(month), 0, 23, 59, 59);
            where.date = { gte: start, lte: end };
        }
        else if (year) {
            const start = new Date(Number(year), 0, 1);
            const end = new Date(Number(year), 11, 31, 23, 59, 59);
            where.date = { gte: start, lte: end };
        }
        if (categoryId)
            where.categoryId = Number(categoryId);
        if (merchantId)
            where.merchantId = Number(merchantId);
        if (paymentStatus)
            where.paymentStatus = paymentStatus;
        if (paymentType)
            where.paymentType = paymentType;
        const skip = (Number(page) - 1) * Number(limit);
        const [expenses, total] = await Promise.all([
            prisma_1.default.expense.findMany({
                where,
                include: expenseInclude,
                orderBy: { date: 'desc' },
                skip,
                take: Number(limit),
            }),
            prisma_1.default.expense.count({ where }),
        ]);
        res.json({ data: expenses, total, page: Number(page), limit: Number(limit) });
    }
    catch (err) {
        next(err);
    }
}
async function createExpense(req, res, next) {
    try {
        const data = expenseSchema.parse(req.body);
        const expense = await prisma_1.default.expense.create({
            data: { ...data, date: new Date(data.date) },
            include: expenseInclude,
        });
        res.status(201).json(expense);
    }
    catch (err) {
        next(err);
    }
}
async function updateExpense(req, res, next) {
    try {
        const { id } = req.params;
        const data = expenseSchema.partial().parse(req.body);
        const expense = await prisma_1.default.expense.update({
            where: { id: Number(id) },
            data: { ...data, ...(data.date ? { date: new Date(data.date) } : {}) },
            include: expenseInclude,
        });
        res.json(expense);
    }
    catch (err) {
        next(err);
    }
}
async function deleteExpense(req, res, next) {
    try {
        const { id } = req.params;
        await prisma_1.default.expense.delete({ where: { id: Number(id) } });
        res.status(204).send();
    }
    catch (err) {
        next(err);
    }
}
async function exportExpenses(req, res, next) {
    try {
        const { month, year } = req.query;
        const where = {};
        if (month && year) {
            const start = new Date(Number(year), Number(month) - 1, 1);
            const end = new Date(Number(year), Number(month), 0, 23, 59, 59);
            where.date = { gte: start, lte: end };
        }
        const expenses = await prisma_1.default.expense.findMany({
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
            ...rows.map(r => headers.map(h => `"${r[h]}"`).join(',')),
        ].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=expenses.csv');
        res.send(csv);
    }
    catch (err) {
        next(err);
    }
}
