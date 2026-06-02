/**
 * Rate limiter distribué via Upstash Redis en production (serverless-safe),
 * avec fallback en mémoire pour le développement local.
 */

// ─── Fallback en mémoire (dev local) ────────────────────────────────────────

interface Bucket { count: number; resetAt: number; }
const memStore = new Map<string, Bucket>();

function memIsRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = memStore.get(key);
  if (!bucket || bucket.resetAt < now) {
    memStore.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  bucket.count += 1;
  return bucket.count > limit;
}

function memResetRateLimit(key: string) {
  memStore.delete(key);
}

// ─── Upstash Redis (production) ──────────────────────────────────────────────

function getRedis() {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const { Redis } = require("@upstash/redis");
  return new Redis({ url, token });
}

async function redisIsRateLimited(
  key: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return memIsRateLimited(key, limit, windowMs);

  const redisKey = `rl:${key}`;
  const count: number = await redis.incr(redisKey);
  if (count === 1) {
    await redis.pexpire(redisKey, windowMs);
  }
  return count > limit;
}

async function redisResetRateLimit(key: string): Promise<void> {
  const redis = getRedis();
  if (!redis) { memResetRateLimit(key); return; }
  await redis.del(`rl:${key}`);
}

// ─── API publique ────────────────────────────────────────────────────────────

export async function isRateLimited(
  key: string,
  limit: number,
  windowMs = 15 * 60 * 1000
): Promise<boolean> {
  return redisIsRateLimited(key, limit, windowMs);
}

export async function resetRateLimit(key: string): Promise<void> {
  return redisResetRateLimit(key);
}
