"use strict";
// ============================================================
// config/database.ts — Prisma client singleton
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.connectDatabase = connectDatabase;
exports.disconnectDatabase = disconnectDatabase;
const client_1 = require("@prisma/client");
const env_1 = require("./env");
const logger_1 = require("./logger");
const createPrismaClient = () => {
    return new client_1.PrismaClient({
        log: env_1.env.NODE_ENV === 'development'
            ? [
                { emit: 'event', level: 'query' },
                { emit: 'event', level: 'error' },
                { emit: 'event', level: 'warn' },
            ]
            : [{ emit: 'event', level: 'error' }],
    });
};
// Prevent multiple instances in development (hot reload)
exports.prisma = env_1.env.NODE_ENV === 'production' ? createPrismaClient() : (global.__prisma ??= createPrismaClient());
if (env_1.env.NODE_ENV === 'development') {
    global.__prisma = exports.prisma;
}
// Log slow queries in development
if (env_1.env.NODE_ENV === 'development') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    exports.prisma.$on('query', (e) => {
        if (e.duration > 200) {
            logger_1.logger.warn('Slow query detected', {
                query: e.query,
                duration: `${e.duration}ms`,
            });
        }
    });
}
async function connectDatabase() {
    try {
        await exports.prisma.$connect();
        logger_1.logger.info('✅ Database connected');
    }
    catch (error) {
        logger_1.logger.error('❌ Database connection failed', { error });
        process.exit(1);
    }
}
async function disconnectDatabase() {
    await exports.prisma.$disconnect();
    logger_1.logger.info('Database disconnected');
}
//# sourceMappingURL=database.js.map