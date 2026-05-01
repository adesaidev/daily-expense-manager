import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';

const nullableStr = z.preprocess(v => v === '' ? null : v, z.string().nullable().optional());
const nullableNum = (schema: z.ZodNumber) =>
  z.preprocess(v => (v === '' || v === null || v === undefined ? null : Number(v)), schema.nullable().optional());

const skuSchema = z.object({
  skuCode: nullableStr,
  name: z.string().min(1, 'Product name is required'),
  description: nullableStr,
  categoryId: z.preprocess(v => (v === '' || v === 0 || v === null || v === undefined ? null : Number(v)), z.number().int().positive().nullable().optional()),
  unit: z.string().min(1).default('pcs'),
  minStock: z.preprocess(v => v === '' || v === null || v === undefined ? 0 : Number(v), z.number().min(0)).default(0),
  costPrice: nullableNum(z.number().positive()),
  mrp: nullableNum(z.number().positive()),
  sellPrice: nullableNum(z.number().positive()),
  hsnCode: nullableStr,
  gstRate: z.preprocess(v => (v === '' || v === null || v === undefined ? null : Number(v)), z.number().min(0).max(100).nullable().optional()),
});

const skuInclude = { category: true };

function userWhere(req: Request) {
  return req.user!.role === 'ADMIN' ? {} : { userId: req.user!.uid };
}

export async function getSKUs(req: Request, res: Response, next: NextFunction) {
  try {
    const skus = await prisma.sKU.findMany({
      where: userWhere(req),
      include: skuInclude,
      orderBy: { name: 'asc' },
    });
    res.json(skus);
  } catch (err) { next(err); }
}

export async function getSKU(req: Request, res: Response, next: NextFunction) {
  try {
    const sku = await prisma.sKU.findFirstOrThrow({
      where: { id: Number(req.params.id), ...userWhere(req) },
      include: skuInclude,
    });
    res.json(sku);
  } catch (err) { next(err); }
}

export async function createSKU(req: Request, res: Response, next: NextFunction) {
  try {
    const data = skuSchema.parse(req.body);
    const sku = await prisma.sKU.create({ data: { ...data, userId: req.user!.uid }, include: skuInclude });
    res.status(201).json(sku);
  } catch (err) { next(err); }
}

export async function updateSKU(req: Request, res: Response, next: NextFunction) {
  try {
    const data = skuSchema.partial().parse(req.body);
    const sku = await prisma.sKU.update({
      where: { id: Number(req.params.id), ...userWhere(req) },
      data,
      include: skuInclude,
    });
    res.json(sku);
  } catch (err) { next(err); }
}

export async function deleteSKU(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.sKU.delete({ where: { id: Number(req.params.id), ...userWhere(req) } });
    res.status(204).send();
  } catch (err) { next(err); }
}
