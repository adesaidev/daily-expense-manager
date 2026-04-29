import 'dotenv/config';
import prisma from './lib/prisma';

const categories = [
  { name: 'Food & Dining', color: '#f97316', icon: 'utensils' },
  { name: 'Transportation', color: '#3b82f6', icon: 'car' },
  { name: 'Shopping', color: '#ec4899', icon: 'shopping-bag' },
  { name: 'Entertainment', color: '#8b5cf6', icon: 'film' },
  { name: 'Health', color: '#10b981', icon: 'heart' },
  { name: 'Housing', color: '#f59e0b', icon: 'home' },
  { name: 'Utilities', color: '#6366f1', icon: 'zap' },
  { name: 'Other', color: '#6b7280', icon: 'tag' },
];

async function main() {
  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }
  console.log('Seeded categories');
}

main().catch(console.error).finally(() => prisma.$disconnect());
