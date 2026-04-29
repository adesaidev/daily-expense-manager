import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import prisma from '../lib/prisma';

const GST_RATES = [0, 5, 12, 18, 28];

const productSchema = z.object({
  name: z.string().min(1),
  genericName: z.string().optional(),
  weightGrams: z.number().positive().optional().nullable(),
  size: z.string().optional().nullable(),
  variation: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  costPrice: z.number().min(0),
  mrp: z.number().min(0),
  recommendedAge: z.string().optional().nullable(),
  includeComponents: z.string().optional().nullable(),
  material: z.string().optional().nullable(),
  packageDimension: z.string().optional().nullable(),
  productDimension: z.string().optional().nullable(),
  hsnCode: z.string().optional().nullable(),
  gstRate: z.number().refine(v => GST_RATES.includes(v)).optional().nullable(),
});

export async function getProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const { search } = req.query;

    const where = search
      ? {
          OR: [
            { name: { contains: String(search), mode: 'insensitive' as const } },
            { genericName: { contains: String(search), mode: 'insensitive' as const } },
            { variation: { contains: String(search), mode: 'insensitive' as const } },
            { size: { contains: String(search), mode: 'insensitive' as const } },
            { color: { contains: String(search), mode: 'insensitive' as const } },
            { material: { contains: String(search), mode: 'insensitive' as const } },
            { recommendedAge: { contains: String(search), mode: 'insensitive' as const } },
            { includeComponents: { contains: String(search), mode: 'insensitive' as const } },
            { hsnCode: { contains: String(search), mode: 'insensitive' as const } },
            { packageDimension: { contains: String(search), mode: 'insensitive' as const } },
            { productDimension: { contains: String(search), mode: 'insensitive' as const } },
          ],
        }
      : {};

    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json(products);
  } catch (err) {
    next(err);
  }
}

export async function getProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await prisma.product.findUnique({ where: { id: Number(req.params.id) } });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    next(err);
  }
}

export async function createProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const data = productSchema.parse(req.body);
    const product = await prisma.product.create({ data });
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const data = productSchema.partial().parse(req.body);
    const product = await prisma.product.update({
      where: { id: Number(req.params.id) },
      data,
    });
    res.json(product);
  } catch (err) {
    next(err);
  }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await prisma.product.findUnique({ where: { id: Number(req.params.id) } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    if (product.imagePath) {
      const filePath = path.join(process.cwd(), 'uploads', path.basename(product.imagePath));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await prisma.product.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function uploadProductImage(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const product = await prisma.product.findUnique({ where: { id: Number(req.params.id) } });
    if (!product) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.imagePath) {
      const old = path.join(process.cwd(), 'uploads', path.basename(product.imagePath));
      if (fs.existsSync(old)) fs.unlinkSync(old);
    }

    const updated = await prisma.product.update({
      where: { id: Number(req.params.id) },
      data: { imagePath: `/uploads/${req.file.filename}` },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function deleteProductImage(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await prisma.product.findUnique({ where: { id: Number(req.params.id) } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    if (product.imagePath) {
      const filePath = path.join(process.cwd(), 'uploads', path.basename(product.imagePath));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    const updated = await prisma.product.update({
      where: { id: Number(req.params.id) },
      data: { imagePath: null },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}
