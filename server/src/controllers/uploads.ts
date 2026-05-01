import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import prisma from '../lib/prisma';

function userWhere(req: Request) {
  return req.user!.role === 'ADMIN' ? {} : { userId: req.user!.uid };
}

export async function uploadBillImage(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { id } = req.params;
    const expense = await prisma.expense.findFirst({
      where: { id: Number(id), ...userWhere(req) },
    });
    if (!expense) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Expense not found' });
    }

    if (expense.billImagePath) {
      const oldPath = path.join(process.cwd(), 'uploads', path.basename(expense.billImagePath));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const billImagePath = `/uploads/${req.file.filename}`;
    const updated = await prisma.expense.update({
      where: { id: Number(id) },
      data: { billImagePath },
      include: { category: true, merchant: true },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function deleteBillImage(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const expense = await prisma.expense.findFirst({
      where: { id: Number(id), ...userWhere(req) },
    });
    if (!expense) return res.status(404).json({ error: 'Expense not found' });

    if (expense.billImagePath) {
      const filePath = path.join(process.cwd(), 'uploads', path.basename(expense.billImagePath));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    const updated = await prisma.expense.update({
      where: { id: Number(id) },
      data: { billImagePath: null },
      include: { category: true, merchant: true },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}
