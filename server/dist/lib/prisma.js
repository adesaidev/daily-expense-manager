"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const adapter_neon_1 = require("@prisma/adapter-neon");
function createPrismaClient() {
    const url = process.env.DATABASE_URL ?? '';
    if (url.includes('neon.tech')) {
        const adapter = new adapter_neon_1.PrismaNeonHTTP(url, {});
        return new client_1.PrismaClient({ adapter });
    }
    return new client_1.PrismaClient();
}
exports.default = createPrismaClient();
