import { PrismaClient } from '@prisma/client';
import { PrismaNeonHTTP } from '@prisma/adapter-neon';

function createPrismaClient() {
  const url = process.env.DATABASE_URL ?? '';
  if (url.includes('neon.tech')) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const neonMod: any = require('@neondatabase/serverless');
    const sql = neonMod.neon(url);
    const adapter = new PrismaNeonHTTP(sql, {});
    return new PrismaClient({ adapter } as any);
  }
  return new PrismaClient();
}

export default createPrismaClient();
