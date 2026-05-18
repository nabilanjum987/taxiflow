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

export async function disconnectRedis(): Promise<void> {
  if (!env.REDIS_URL || env.NODE_ENV === 'development') {
    return;
  }
  try {
    await redis.quit();
    logger.info('Redis disconnected');
  } catch (error) {
    logger.warn('Redis disconnect failed', { error });
  }
}

export async function cacheGet(key: string): Promise<string | null> {
  try {
    if (!env.REDIS_URL || env.NODE_ENV === 'development') return null;
    return await redis.get(key);
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: string, ttl?: number): Promise<void> {
  try {
    if (!env.REDIS_URL || env.NODE_ENV === 'development') return;
    if (ttl) {
      await redis.set(key, value, 'EX', ttl);
    } else {
      await redis.set(key, value);
    }
  } catch {
    // ignore
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    if (!env.REDIS_URL || env.NODE_ENV === 'development') return;
    await redis.del(key);
  } catch {
    // ignore
  }
}