import { PrismaClient } from '@prisma/client';
import { neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

function createPrismaClient() {
  const url = process.env.DATABASE_URL ?? '';
  if (url.includes('neon.tech')) {
    neonConfig.webSocketConstructor = ws;
    const adapter = new PrismaNeon({ connectionString: url });
    return new PrismaClient({ adapter });
  }
  return new PrismaClient();
}

export default createPrismaClient();
