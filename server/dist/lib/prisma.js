"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const adapter_neon_1 = require("@prisma/adapter-neon");
function createPrismaClient() {
    const url = process.env.DATABASE_URL ?? '';
    if (url.includes('neon.tech')) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const neonMod = require('@neondatabase/serverless');
        const sql = neonMod.neon(url);
        const adapter = new adapter_neon_1.PrismaNeonHTTP(sql, {});
        return new client_1.PrismaClient({ adapter });
    }
    return new client_1.PrismaClient();
}
exports.default = createPrismaClient();
