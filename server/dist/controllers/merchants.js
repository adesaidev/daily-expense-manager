"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMerchants = getMerchants;
exports.getMerchant = getMerchant;
exports.createMerchant = createMerchant;
exports.updateMerchant = updateMerchant;
exports.deleteMerchant = deleteMerchant;
exports.getMerchantBreakdown = getMerchantBreakdown;
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../lib/prisma"));
const merchantSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    website: zod_1.z.string().url().optional().or(zod_1.z.literal('')),
    logo: zod_1.z.string().optional(),
    categoryId: zod_1.z.number().int().positive().optional().nullable(),
});
async function getMerchants(_req, res, next) {
    try {
        const merchants = await prisma_1.default.merchant.findMany({
            include: {
                _count: { select: { expenses: true } },
            },
            orderBy: { name: 'asc' },
        });
        res.json(merchants);
    }
    catch (err) {
        next(err);
    }
}
async function getMerchant(req, res, next) {
    try {
        const { id } = req.params;
        const merchant = await prisma_1.default.merchant.findUnique({
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
        if (!merchant)
            return res.status(404).json({ error: 'Merchant not found' });
        res.json(merchant);
    }
    catch (err) {
        next(err);
    }
}
async function createMerchant(req, res, next) {
    try {
        const data = merchantSchema.parse(req.body);
        const merchant = await prisma_1.default.merchant.create({ data });
        res.status(201).json(merchant);
    }
    catch (err) {
        next(err);
    }
}
async function updateMerchant(req, res, next) {
    try {
        const { id } = req.params;
        const data = merchantSchema.partial().parse(req.body);
        const merchant = await prisma_1.default.merchant.update({
            where: { id: Number(id) },
            data,
        });
        res.json(merchant);
    }
    catch (err) {
        next(err);
    }
}
async function deleteMerchant(req, res, next) {
    try {
        const { id } = req.params;
        // Unlink expenses before deleting
        await prisma_1.default.expense.updateMany({
            where: { merchantId: Number(id) },
            data: { merchantId: null },
        });
        await prisma_1.default.merchant.delete({ where: { id: Number(id) } });
        res.status(204).send();
    }
    catch (err) {
        next(err);
    }
}
async function getMerchantBreakdown(req, res, next) {
    try {
        const { month, year } = req.query;
        const where = { merchantId: { not: null } };
        if (month && year) {
            const start = new Date(Number(year), Number(month) - 1, 1);
            const end = new Date(Number(year), Number(month), 0, 23, 59, 59);
            where.date = { gte: start, lte: end };
        }
        const result = await prisma_1.default.expense.groupBy({
            by: ['merchantId'],
            where,
            _sum: { amount: true },
            _count: true,
            orderBy: { _sum: { amount: 'desc' } },
        });
        const merchantIds = result.map(r => r.merchantId).filter(Boolean);
        const merchants = await prisma_1.default.merchant.findMany({ where: { id: { in: merchantIds } } });
        const merchantMap = Object.fromEntries(merchants.map(m => [m.id, m]));
        const breakdown = result.map(r => ({
            merchantId: r.merchantId,
            merchant: merchantMap[r.merchantId],
            total: Number(r._sum.amount?.toFixed(2) ?? 0),
            count: r._count,
        }));
        res.json(breakdown);
    }
    catch (err) {
        next(err);
    }
}
