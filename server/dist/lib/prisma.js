"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const serverless_1 = require("@neondatabase/serverless");
const adapter_neon_1 = require("@prisma/adapter-neon");
const ws_1 = __importDefault(require("ws"));
serverless_1.neonConfig.webSocketConstructor = ws_1.default;
function createPrismaClient() {
    const url = process.env.DATABASE_URL ?? '';
    if (url.includes('neon.tech')) {
        const pool = new serverless_1.Pool({ connectionString: url });
        const adapter = new adapter_neon_1.PrismaNeon(pool);
        return new client_1.PrismaClient({ adapter });
    }
    return new client_1.PrismaClient();
}
exports.default = createPrismaClient();
