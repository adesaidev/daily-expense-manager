import type { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email: string;
        name: string | null;
        role: Role;
      };
    }
  }
}

export {};
