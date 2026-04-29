"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
function createPrismaClient() {
    if (process.env.NODE_ENV === 'production') {
        const { Pool, neonConfig } = require('@neondatabase/serverless');
        const { PrismaNeon } = require('@prisma/adapter-neon');
        const ws = require('ws');
        neonConfig.webSocketConstructor = ws;
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        const adapter = new PrismaNeon(pool);
        return new client_1.PrismaClient({ adapter });
    }
    return new client_1.PrismaClient();
}
exports.default = createPrismaClient();
