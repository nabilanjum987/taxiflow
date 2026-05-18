"use strict";
// ============================================================
// config/redis.ts — Redis client (ioredis)
// Used for: caching, job queues (Bull), sessions, rate limits
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
exports.connectRedis = connectRedis;
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("./env");
const logger_1 = require("./logger");
exports.redis = new ioredis_1.default(env_1.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    enableOfflineQueue: false,
    retryStrategy(times) {
        if (times > 3)
            return null; // stop retrying
        const delay = Math.min(times * 100, 3000);
        return delay;
    },
});
exports.redis.on('connect', () => {
    logger_1.logger.info('✅ Redis connected');
});
exports.redis.on('error', (error) => {
    logger_1.logger.error('Redis error', { error: error.message });
});
exports.redis.on('close', () => {
    logger_1.logger.warn('Redis connection closed');
});
async function connectRedis() {
    if (!env_1.env.REDIS_URL || env_1.env.NODE_ENV === 'development') {
        logger_1.logger.warn('⚠️  Redis skipped — running without cache in dev mode');
        return;
    }
    try {
        await exports.redis.connect();
    }
    catch (error) {
        logger_1.logger.warn('⚠️  Redis unavailable, continuing without cache');
    }
}
//# sourceMappingURL=redis.js.map