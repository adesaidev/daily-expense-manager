import { PrismaClient } from '@prisma/client';
import { PrismaNeonHTTP } from '@prisma/adapter-neon';

function createPrismaClient() {
  const url = process.env.DATABASE_URL ?? '';
  if (url.includes('neon.tech')) {
    const adapter = new PrismaNeonHTTP(url, {});
    return new PrismaClient({ adapter });
  }
  return new PrismaClient();
}

export default createPrismaClient();
