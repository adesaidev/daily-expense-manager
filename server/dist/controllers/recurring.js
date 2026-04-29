"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecurring = getRecurring;
exports.createRecurring = createRecurring;
exports.updateRecurring = updateRecurring;
exports.deleteRecurring = deleteRecurring;
exports.processRecurring = processRecurring;
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../lib/prisma"));
const recurringSchema = zod_1.z.object({
    amount: zod_1.z.number().positive(),
    description: zod_1.z.string().min(1),
    categoryId: zod_1.z.number().int().positive(),
    frequency: zod_1.z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
    startDate: zod_1.z.string().datetime(),
    endDate: zod_1.z.string().datetime().optional(),
    isActive: zod_1.z.boolean().optional(),
});
async function getRecurring(_req, res, next) {
    try {
        const recurring = await prisma_1.default.recurring.findMany({
            include: { expenses: { orderBy: { date: 'desc' }, take: 1 } },
            orderBy: { createdAt: 'desc' },
        });
        res.json(recurring);
    }
    catch (err) {
        next(err);
    }
}
async function createRecurring(req, res, next) {
    try {
        const data = recurringSchema.parse(req.body);
        const recurring = await prisma_1.default.recurring.create({
            data: {
                ...data,
                startDate: new Date(data.startDate),
                endDate: data.endDate ? new Date(data.endDate) : null,
            },
        });
        res.status(201).json(recurring);
    }
    catch (err) {
        next(err);
    }
}
async function updateRecurring(req, res, next) {
    try {
        const { id } = req.params;
        const data = recurringSchema.partial().parse(req.body);
        const recurring = await prisma_1.default.recurring.update({
            where: { id: Number(id) },
            data: {
                ...data,
                ...(data.startDate ? { startDate: new Date(data.startDate) } : {}),
                ...(data.endDate ? { endDate: new Date(data.endDate) } : {}),
            },
        });
        res.json(recurring);
    }
    catch (err) {
        next(err);
    }
}
async function deleteRecurring(req, res, next) {
    try {
        const { id } = req.params;
        await prisma_1.default.recurring.delete({ where: { id: Number(id) } });
        res.status(204).send();
    }
    catch (err) {
        next(err);
    }
}
async function processRecurring(_req, res, next) {
    try {
        const now = new Date();
        const actives = await prisma_1.default.recurring.findMany({
            where: { isActive: true, startDate: { lte: now } },
        });
        let created = 0;
        for (const r of actives) {
            if (r.endDate && r.endDate < now)
                continue;
            const lastRun = r.lastRun ?? r.startDate;
            const nextRun = getNextRun(lastRun, r.frequency);
            if (nextRun <= now) {
                await prisma_1.default.expense.create({
                    data: {
                        amount: r.amount,
                        description: r.description,
                        date: nextRun,
                        categoryId: r.categoryId,
                        isRecurring: true,
                        recurringId: r.id,
                    },
                });
                await prisma_1.default.recurring.update({
                    where: { id: r.id },
                    data: { lastRun: nextRun },
                });
                created++;
            }
        }
        res.json({ processed: actives.length, created });
    }
    catch (err) {
        next(err);
    }
}
function getNextRun(last, frequency) {
    const d = new Date(last);
    switch (frequency) {
        case 'DAILY':
            d.setDate(d.getDate() + 1);
            break;
        case 'WEEKLY':
            d.setDate(d.getDate() + 7);
            break;
        case 'MONTHLY':
            d.setMonth(d.getMonth() + 1);
            break;
        case 'YEARLY':
            d.setFullYear(d.getFullYear() + 1);
            break;
    }
    return d;
}
