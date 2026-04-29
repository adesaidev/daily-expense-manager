"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCategories = getCategories;
exports.createCategory = createCategory;
exports.updateCategory = updateCategory;
exports.deleteCategory = deleteCategory;
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../lib/prisma"));
const categorySchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    color: zod_1.z.string().optional(),
    icon: zod_1.z.string().optional(),
});
async function getCategories(_req, res, next) {
    try {
        const categories = await prisma_1.default.category.findMany({
            include: { _count: { select: { expenses: true } } },
            orderBy: { name: 'asc' },
        });
        res.json(categories);
    }
    catch (err) {
        next(err);
    }
}
async function createCategory(req, res, next) {
    try {
        const data = categorySchema.parse(req.body);
        const category = await prisma_1.default.category.create({ data });
        res.status(201).json(category);
    }
    catch (err) {
        next(err);
    }
}
async function updateCategory(req, res, next) {
    try {
        const { id } = req.params;
        const data = categorySchema.partial().parse(req.body);
        const category = await prisma_1.default.category.update({ where: { id: Number(id) }, data });
        res.json(category);
    }
    catch (err) {
        next(err);
    }
}
async function deleteCategory(req, res, next) {
    try {
        const { id } = req.params;
        await prisma_1.default.category.delete({ where: { id: Number(id) } });
        res.status(204).send();
    }
    catch (err) {
        next(err);
    }
}
