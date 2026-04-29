import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

function createPrismaClient() {
  const url = process.env.DATABASE_URL ?? '';
  if (url.includes('neon.tech')) {
    const pool = new Pool({ connectionString: url });
    const adapter = new PrismaNeon(pool as any);
    return new PrismaClient({ adapter } as any);
  }
  return new PrismaClient();
}

export default createPrismaClient();
