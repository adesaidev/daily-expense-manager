import { PrismaClient } from '@prisma/client';

function createPrismaClient() {
  if (process.env.NODE_ENV === 'production') {
    const { Pool, neonConfig } = require('@neondatabase/serverless');
    const { PrismaNeon } = require('@prisma/adapter-neon');
    const ws = require('ws');
    neonConfig.webSocketConstructor = ws;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaNeon(pool);
    return new PrismaClient({ adapter } as any);
  }
  return new PrismaClient();
}

export default createPrismaClient();
