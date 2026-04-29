"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProducts = getProducts;
exports.getProduct = getProduct;
exports.createProduct = createProduct;
exports.updateProduct = updateProduct;
exports.deleteProduct = deleteProduct;
exports.uploadProductImage = uploadProductImage;
exports.deleteProductImage = deleteProductImage;
const zod_1 = require("zod");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const GST_RATES = [0, 5, 12, 18, 28];
const productSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    genericName: zod_1.z.string().optional(),
    weightGrams: zod_1.z.number().positive().optional().nullable(),
    size: zod_1.z.string().optional().nullable(),
    variation: zod_1.z.string().optional().nullable(),
    color: zod_1.z.string().optional().nullable(),
    costPrice: zod_1.z.number().min(0),
    mrp: zod_1.z.number().min(0),
    recommendedAge: zod_1.z.string().optional().nullable(),
    includeComponents: zod_1.z.string().optional().nullable(),
    material: zod_1.z.string().optional().nullable(),
    packageDimension: zod_1.z.string().optional().nullable(),
    productDimension: zod_1.z.string().optional().nullable(),
    hsnCode: zod_1.z.string().optional().nullable(),
    gstRate: zod_1.z.number().refine(v => GST_RATES.includes(v)).optional().nullable(),
});
async function getProducts(req, res, next) {
    try {
        const { search } = req.query;
        const where = search
            ? {
                OR: [
                    { name: { contains: String(search), mode: 'insensitive' } },
                    { genericName: { contains: String(search), mode: 'insensitive' } },
                    { variation: { contains: String(search), mode: 'insensitive' } },
                    { size: { contains: String(search), mode: 'insensitive' } },
                    { color: { contains: String(search), mode: 'insensitive' } },
                    { material: { contains: String(search), mode: 'insensitive' } },
                    { recommendedAge: { contains: String(search), mode: 'insensitive' } },
                    { includeComponents: { contains: String(search), mode: 'insensitive' } },
                    { hsnCode: { contains: String(search), mode: 'insensitive' } },
                    { packageDimension: { contains: String(search), mode: 'insensitive' } },
                    { productDimension: { contains: String(search), mode: 'insensitive' } },
                ],
            }
            : {};
        const products = await prisma_1.default.product.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });
        res.json(products);
    }
    catch (err) {
        next(err);
    }
}
async function getProduct(req, res, next) {
    try {
        const product = await prisma_1.default.product.findUnique({ where: { id: Number(req.params.id) } });
        if (!product)
            return res.status(404).json({ error: 'Product not found' });
        res.json(product);
    }
    catch (err) {
        next(err);
    }
}
async function createProduct(req, res, next) {
    try {
        const data = productSchema.parse(req.body);
        const product = await prisma_1.default.product.create({ data });
        res.status(201).json(product);
    }
    catch (err) {
        next(err);
    }
}
async function updateProduct(req, res, next) {
    try {
        const data = productSchema.partial().parse(req.body);
        const product = await prisma_1.default.product.update({
            where: { id: Number(req.params.id) },
            data,
        });
        res.json(product);
    }
    catch (err) {
        next(err);
    }
}
async function deleteProduct(req, res, next) {
    try {
        const product = await prisma_1.default.product.findUnique({ where: { id: Number(req.params.id) } });
        if (!product)
            return res.status(404).json({ error: 'Product not found' });
        if (product.imagePath) {
            const filePath = path_1.default.join(process.cwd(), 'uploads', path_1.default.basename(product.imagePath));
            if (fs_1.default.existsSync(filePath))
                fs_1.default.unlinkSync(filePath);
        }
        await prisma_1.default.product.delete({ where: { id: Number(req.params.id) } });
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
}
async function uploadProductImage(req, res, next) {
    try {
        if (!req.file)
            return res.status(400).json({ error: 'No file uploaded' });
        const product = await prisma_1.default.product.findUnique({ where: { id: Number(req.params.id) } });
        if (!product) {
            fs_1.default.unlinkSync(req.file.path);
            return res.status(404).json({ error: 'Product not found' });
        }
        if (product.imagePath) {
            const old = path_1.default.join(process.cwd(), 'uploads', path_1.default.basename(product.imagePath));
            if (fs_1.default.existsSync(old))
                fs_1.default.unlinkSync(old);
        }
        const updated = await prisma_1.default.product.update({
            where: { id: Number(req.params.id) },
            data: { imagePath: `/uploads/${req.file.filename}` },
        });
        res.json(updated);
    }
    catch (err) {
        next(err);
    }
}
async function deleteProductImage(req, res, next) {
    try {
        const product = await prisma_1.default.product.findUnique({ where: { id: Number(req.params.id) } });
        if (!product)
            return res.status(404).json({ error: 'Product not found' });
        if (product.imagePath) {
            const filePath = path_1.default.join(process.cwd(), 'uploads', path_1.default.basename(product.imagePath));
            if (fs_1.default.existsSync(filePath))
                fs_1.default.unlinkSync(filePath);
        }
        const updated = await prisma_1.default.product.update({
            where: { id: Number(req.params.id) },
            data: { imagePath: null },
        });
        res.json(updated);
    }
    catch (err) {
        next(err);
    }
}
