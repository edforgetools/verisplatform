let redisClient: any = null;

async function getRedis() {
  if (redisClient) return redisClient;
  const url = process.env.UPSTASH_REDIS_URL || process.env.REDIS_URL;
  if (!url) return null;
  const { default: Redis } = await import('ioredis');
  redisClient = new Redis(url);
  return redisClient;
}

export async function rateLimit(key: string, limit = 60, windowSec = 60) {
  const redis = await getRedis();
  if (!redis) return { allowed: true, remaining: limit };
  const bucket = `rl:${key}`;
  const used = await redis.incr(bucket);
  if (used === 1) await redis.expire(bucket, windowSec);
  return { allowed: used <= limit, remaining: Math.max(limit - used, 0) };
}
