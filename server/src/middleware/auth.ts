import { Request, Response, NextFunction } from 'express';
import admin from '../lib/firebaseAdmin';
import prisma from '../lib/prisma';

const DEFAULT_CATEGORIES = [
  { name: 'Food & Dining', color: '#f97316', icon: 'utensils' },
  { name: 'Transportation', color: '#3b82f6', icon: 'car' },
  { name: 'Shopping', color: '#ec4899', icon: 'shopping-bag' },
  { name: 'Entertainment', color: '#8b5cf6', icon: 'film' },
  { name: 'Health', color: '#10b981', icon: 'heart' },
  { name: 'Housing', color: '#f59e0b', icon: 'home' },
  { name: 'Utilities', color: '#6366f1', icon: 'zap' },
  { name: 'Other', color: '#6b7280', icon: 'tag' },
];

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = await admin.auth().verifyIdToken(token);

    let user = await prisma.user.findUnique({ where: { id: decoded.uid } });
    const isNewUser = !user;

    if (user) {
      user = await prisma.user.update({
        where: { id: decoded.uid },
        data: { email: decoded.email ?? user.email, name: decoded.name ?? user.name },
      });
    } else {
      user = await prisma.user.create({
        data: { id: decoded.uid, email: decoded.email ?? '', name: decoded.name ?? null },
      });
    }

    if (isNewUser) {
      for (const cat of DEFAULT_CATEGORIES) {
        await prisma.category.create({ data: { ...cat, userId: decoded.uid } });
      }
    }

    req.user = { uid: user.id, email: user.email, name: user.name, role: user.role };
    next();
  } catch (err) {
    console.error('[auth] verifyIdToken failed:', err);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
