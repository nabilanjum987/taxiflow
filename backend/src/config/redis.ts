// ============================================================
// config/redis.ts — Redis client (ioredis)
// Used for: caching, job queues (Bull), sessions, rate limits
// ============================================================

import Redis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

export const redis = new Redis(env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  enableOfflineQueue: false,
  retryStrategy(times) {
    if (times > 3) return null; // stop retrying
    const delay = Math.min(times * 100, 3000);
    return delay;
  },
});

redis.on('connect', () => {
  logger.info('✅ Redis connected');
});

redis.on('error', (error: Error) => {
  logger.error('Redis error', { error: error.message });
});

redis.on('close', () => {
  logger.warn('Redis connection closed');
});

export async function connectRedis(): Promise<void> {
  if (!env.REDIS_URL || env.NODE_ENV === 'development') {
    logger.warn('⚠️  Redis skipped — running without cache in dev mode');
    return;
  }
  try {
    await redis.connect();
  } catch (error) {
    logger.warn('⚠️  Redis unavailable, continuing without cache');
  }
}