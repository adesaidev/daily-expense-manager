"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPurchases = getPurchases;
exports.getPurchase = getPurchase;
exports.createPurchase = createPurchase;
exports.updatePurchase = updatePurchase;
exports.deletePurchase = deletePurchase;
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../lib/prisma"));
const itemSchema = zod_1.z.object({
    skuId: zod_1.z.number().int().positive(),
    quantity: zod_1.z.number().positive(),
    unitPrice: zod_1.z.number().min(0),
});
const purchaseSchema = zod_1.z.object({
    merchantId: zod_1.z.number().int().positive().optional().nullable(),
    date: zod_1.z.string().datetime().optional(),
    notes: zod_1.z.string().optional().nullable(),
    status: zod_1.z.enum(['PENDING', 'COMPLETED', 'CANCELLED']).default('COMPLETED'),
    items: zod_1.z.array(itemSchema).min(1),
});
const purchaseInclude = {
    merchant: true,
    items: { include: { sku: true } },
};
async function adjustStock(items, direction) {
    for (const item of items) {
        await prisma_1.default.sKU.update({
            where: { id: item.skuId },
            data: { currentStock: { increment: item.quantity * direction } },
        });
    }
}
async function getPurchases(req, res, next) {
    try {
        const { merchantId, status, page = '1', limit = '20' } = req.query;
        const where = {};
        if (merchantId)
            where.merchantId = Number(merchantId);
        if (status)
            where.status = status;
        const skip = (Number(page) - 1) * Number(limit);
        const [purchases, total] = await Promise.all([
            prisma_1.default.purchase.findMany({ where, include: purchaseInclude, orderBy: { date: 'desc' }, skip, take: Number(limit) }),
            prisma_1.default.purchase.count({ where }),
        ]);
        res.json({ data: purchases, total, page: Number(page), limit: Number(limit) });
    }
    catch (err) {
        next(err);
    }
}
async function getPurchase(req, res, next) {
    try {
        const purchase = await prisma_1.default.purchase.findUniqueOrThrow({ where: { id: Number(req.params.id) }, include: purchaseInclude });
        res.json(purchase);
    }
    catch (err) {
        next(err);
    }
}
async function createPurchase(req, res, next) {
    try {
        const { items, ...rest } = purchaseSchema.parse(req.body);
        const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
        const purchase = await prisma_1.default.$transaction(async (tx) => {
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
    }
    catch (err) {
        next(err);
    }
}
async function updatePurchase(req, res, next) {
    try {
        const { items, ...rest } = purchaseSchema.partial().parse(req.body);
        const existing = await prisma_1.default.purchase.findUniqueOrThrow({
            where: { id: Number(req.params.id) },
            include: { items: true },
        });
        const purchase = await prisma_1.default.$transaction(async (tx) => {
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
    }
    catch (err) {
        next(err);
    }
}
async function deletePurchase(req, res, next) {
    try {
        const existing = await prisma_1.default.purchase.findUniqueOrThrow({
            where: { id: Number(req.params.id) },
            include: { items: true },
        });
        await prisma_1.default.$transaction(async (tx) => {
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
    }
    catch (err) {
        next(err);
    }
}
