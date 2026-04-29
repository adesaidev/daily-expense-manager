"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadBillImage = uploadBillImage;
exports.deleteBillImage = deleteBillImage;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const prisma_1 = __importDefault(require("../lib/prisma"));
async function uploadBillImage(req, res, next) {
    try {
        if (!req.file)
            return res.status(400).json({ error: 'No file uploaded' });
        const { id } = req.params;
        const expense = await prisma_1.default.expense.findUnique({ where: { id: Number(id) } });
        if (!expense) {
            fs_1.default.unlinkSync(req.file.path);
            return res.status(404).json({ error: 'Expense not found' });
        }
        // Delete old image if replacing
        if (expense.billImagePath) {
            const oldPath = path_1.default.join(process.cwd(), 'uploads', path_1.default.basename(expense.billImagePath));
            if (fs_1.default.existsSync(oldPath))
                fs_1.default.unlinkSync(oldPath);
        }
        const billImagePath = `/uploads/${req.file.filename}`;
        const updated = await prisma_1.default.expense.update({
            where: { id: Number(id) },
            data: { billImagePath },
            include: { category: true, merchant: true },
        });
        res.json(updated);
    }
    catch (err) {
        next(err);
    }
}
async function deleteBillImage(req, res, next) {
    try {
        const { id } = req.params;
        const expense = await prisma_1.default.expense.findUnique({ where: { id: Number(id) } });
        if (!expense)
            return res.status(404).json({ error: 'Expense not found' });
        if (expense.billImagePath) {
            const filePath = path_1.default.join(process.cwd(), 'uploads', path_1.default.basename(expense.billImagePath));
            if (fs_1.default.existsSync(filePath))
                fs_1.default.unlinkSync(filePath);
        }
        const updated = await prisma_1.default.expense.update({
            where: { id: Number(id) },
            data: { billImagePath: null },
            include: { category: true, merchant: true },
        });
        res.json(updated);
    }
    catch (err) {
        next(err);
    }
}
