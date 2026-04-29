import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';

const categorySchema = z.object({
  name: z.string().min(1),
  color: z.string().optional(),
  icon: z.string().optional(),
});

export async function getCategories(_req: Request, res: Response, next: NextFunction) {
  try {
    const categories = await prisma.category.findMany({
      include: { _count: { select: { expenses: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(categories);
  } catch (err) {
    next(err);
  }
}

export async function createCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const data = categorySchema.parse(req.body);
    const category = await prisma.category.create({ data });
    res.status(201).json(category);
  } catch (err) {
    next(err);
  }
}

export async function updateCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const data = categorySchema.partial().parse(req.body);
    const category = await prisma.category.update({ where: { id: Number(id) }, data });
    res.json(category);
  } catch (err) {
    next(err);
  }
}

export async function deleteCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    await prisma.category.delete({ where: { id: Number(id) } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
