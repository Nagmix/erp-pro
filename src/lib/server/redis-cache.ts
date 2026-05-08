import Redis from 'ioredis';

let redisClient: Redis | null = null;

/** Optional Redis for GET caching (`REDIS_URL` unset → always miss). */
export async function getRedis(): Promise<Redis | null> {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;
  if (!redisClient) {
    try {
      redisClient = new Redis(url, {
        maxRetriesPerRequest: 2,
        lazyConnect: false,
      });
    } catch {
      return null;
    }
  }
  return redisClient;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const r = await getRedis();
  if (!r) return null;
  try {
    const raw = await r.get(key);
    if (raw == null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSec: number): Promise<void> {
  const r = await getRedis();
  if (!r) return;
  try {
    await r.set(key, JSON.stringify(value), 'EX', ttlSec);
  } catch {
    /* ignore */
  }
}
