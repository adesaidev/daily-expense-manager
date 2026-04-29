"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSellOrders = getSellOrders;
exports.getSellOrder = getSellOrder;
exports.createSellOrder = createSellOrder;
exports.updateSellOrder = updateSellOrder;
exports.deleteSellOrder = deleteSellOrder;
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../lib/prisma"));
const itemSchema = zod_1.z.object({
    skuId: zod_1.z.number().int().positive(),
    quantity: zod_1.z.number().positive(),
    unitPrice: zod_1.z.number().min(0),
});
const sellOrderSchema = zod_1.z.object({
    customerName: zod_1.z.string().optional().nullable(),
    date: zod_1.z.string().datetime().optional(),
    notes: zod_1.z.string().optional().nullable(),
    status: zod_1.z.enum(['PENDING', 'COMPLETED', 'CANCELLED']).default('COMPLETED'),
    items: zod_1.z.array(itemSchema).min(1),
});
const sellOrderInclude = {
    items: { include: { sku: true } },
};
async function getSellOrders(req, res, next) {
    try {
        const { status, page = '1', limit = '20' } = req.query;
        const where = {};
        if (status)
            where.status = status;
        const skip = (Number(page) - 1) * Number(limit);
        const [orders, total] = await Promise.all([
            prisma_1.default.sellOrder.findMany({ where, include: sellOrderInclude, orderBy: { date: 'desc' }, skip, take: Number(limit) }),
            prisma_1.default.sellOrder.count({ where }),
        ]);
        res.json({ data: orders, total, page: Number(page), limit: Number(limit) });
    }
    catch (err) {
        next(err);
    }
}
async function getSellOrder(req, res, next) {
    try {
        const order = await prisma_1.default.sellOrder.findUniqueOrThrow({ where: { id: Number(req.params.id) }, include: sellOrderInclude });
        res.json(order);
    }
    catch (err) {
        next(err);
    }
}
async function createSellOrder(req, res, next) {
    try {
        const { items, ...rest } = sellOrderSchema.parse(req.body);
        const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
        const order = await prisma_1.default.$transaction(async (tx) => {
            if (rest.status === 'COMPLETED') {
                for (const item of items) {
                    const sku = await tx.sKU.findUniqueOrThrow({ where: { id: item.skuId } });
                    if (Number(sku.currentStock) < item.quantity) {
                        throw new Error(`Insufficient stock for "${sku.name}": available ${sku.currentStock}, requested ${item.quantity}`);
                    }
                }
            }
            const created = await tx.sellOrder.create({
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
                include: sellOrderInclude,
            });
            if (rest.status === 'COMPLETED') {
                for (const item of items) {
                    await tx.sKU.update({
                        where: { id: item.skuId },
                        data: { currentStock: { decrement: item.quantity } },
                    });
                }
            }
            return created;
        });
        res.status(201).json(order);
    }
    catch (err) {
        next(err);
    }
}
async function updateSellOrder(req, res, next) {
    try {
        const { items, ...rest } = sellOrderSchema.partial().parse(req.body);
        const existing = await prisma_1.default.sellOrder.findUniqueOrThrow({
            where: { id: Number(req.params.id) },
            include: { items: true },
        });
        const order = await prisma_1.default.$transaction(async (tx) => {
            // Reverse old stock effect if was COMPLETED
            if (existing.status === 'COMPLETED') {
                for (const item of existing.items) {
                    await tx.sKU.update({
                        where: { id: item.skuId },
                        data: { currentStock: { increment: Number(item.quantity) } },
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
            if (newStatus === 'COMPLETED') {
                for (const item of newItems) {
                    const sku = await tx.sKU.findUniqueOrThrow({ where: { id: item.skuId } });
                    if (Number(sku.currentStock) < item.quantity) {
                        throw new Error(`Insufficient stock for "${sku.name}": available ${sku.currentStock}, requested ${item.quantity}`);
                    }
                }
            }
            const updated = await tx.sellOrder.update({
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
                include: sellOrderInclude,
            });
            if (newStatus === 'COMPLETED') {
                for (const item of newItems) {
                    await tx.sKU.update({
                        where: { id: item.skuId },
                        data: { currentStock: { decrement: item.quantity } },
                    });
                }
            }
            return updated;
        });
        res.json(order);
    }
    catch (err) {
        next(err);
    }
}
async function deleteSellOrder(req, res, next) {
    try {
        const existing = await prisma_1.default.sellOrder.findUniqueOrThrow({
            where: { id: Number(req.params.id) },
            include: { items: true },
        });
        await prisma_1.default.$transaction(async (tx) => {
            if (existing.status === 'COMPLETED') {
                for (const item of existing.items) {
                    await tx.sKU.update({
                        where: { id: item.skuId },
                        data: { currentStock: { increment: Number(item.quantity) } },
                    });
                }
            }
            await tx.sellOrder.delete({ where: { id: Number(req.params.id) } });
        });
        res.status(204).send();
    }
    catch (err) {
        next(err);
    }
}
