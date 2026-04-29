"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSKUs = getSKUs;
exports.getSKU = getSKU;
exports.createSKU = createSKU;
exports.updateSKU = updateSKU;
exports.deleteSKU = deleteSKU;
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../lib/prisma"));
const nullableStr = zod_1.z.preprocess(v => v === '' ? null : v, zod_1.z.string().nullable().optional());
const nullableNum = (schema) => zod_1.z.preprocess(v => (v === '' || v === null || v === undefined ? null : Number(v)), schema.nullable().optional());
const skuSchema = zod_1.z.object({
    skuCode: nullableStr,
    name: zod_1.z.string().min(1, 'Product name is required'),
    description: nullableStr,
    categoryId: zod_1.z.preprocess(v => (v === '' || v === 0 || v === null || v === undefined ? null : Number(v)), zod_1.z.number().int().positive().nullable().optional()),
    unit: zod_1.z.string().min(1).default('pcs'),
    minStock: zod_1.z.preprocess(v => v === '' || v === null || v === undefined ? 0 : Number(v), zod_1.z.number().min(0)).default(0),
    costPrice: nullableNum(zod_1.z.number().positive()),
    mrp: nullableNum(zod_1.z.number().positive()),
    sellPrice: nullableNum(zod_1.z.number().positive()),
    hsnCode: nullableStr,
    gstRate: zod_1.z.preprocess(v => (v === '' || v === null || v === undefined ? null : Number(v)), zod_1.z.number().min(0).max(100).nullable().optional()),
});
const skuInclude = { category: true };
async function getSKUs(req, res, next) {
    try {
        const skus = await prisma_1.default.sKU.findMany({ include: skuInclude, orderBy: { name: 'asc' } });
        res.json(skus);
    }
    catch (err) {
        next(err);
    }
}
async function getSKU(req, res, next) {
    try {
        const sku = await prisma_1.default.sKU.findUniqueOrThrow({ where: { id: Number(req.params.id) }, include: skuInclude });
        res.json(sku);
    }
    catch (err) {
        next(err);
    }
}
async function createSKU(req, res, next) {
    try {
        const data = skuSchema.parse(req.body);
        const sku = await prisma_1.default.sKU.create({ data, include: skuInclude });
        res.status(201).json(sku);
    }
    catch (err) {
        next(err);
    }
}
async function updateSKU(req, res, next) {
    try {
        const data = skuSchema.partial().parse(req.body);
        const sku = await prisma_1.default.sKU.update({ where: { id: Number(req.params.id) }, data, include: skuInclude });
        res.json(sku);
    }
    catch (err) {
        next(err);
    }
}
async function deleteSKU(req, res, next) {
    try {
        await prisma_1.default.sKU.delete({ where: { id: Number(req.params.id) } });
        res.status(204).send();
    }
    catch (err) {
        next(err);
    }
}
