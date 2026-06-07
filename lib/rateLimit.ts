/**
 * Rate limiter distribué via Redis (REDIS_URL) en production,
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

// ─── Upstash Redis REST (production serverless — recommandé) ────────────────
// Le client REST (HTTP) n'ouvre pas de connexion TCP par requête : idéal pour
// Vercel / serverless. Activé dès que UPSTASH_REDIS_REST_URL + TOKEN sont définis.

let upstashClient: any = null;
let upstashTried = false;

async function getUpstash(): Promise<any | null> {
  if (upstashClient) return upstashClient;
  if (upstashTried) return null;
  upstashTried = true;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const { Redis } = await import("@upstash/redis");
    upstashClient = new Redis({ url, token });
    return upstashClient;
  } catch {
    return null;
  }
}

// ─── Redis distribué (production) ───────────────────────────────────────────

async function redisIsRateLimited(
  key: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  const url = process.env.REDIS_URL;
  if (!url) return memIsRateLimited(key, limit, windowMs);

  const { createClient } = await import("redis");
  const client = createClient({ url });
  try {
    await client.connect();
    const redisKey = `rl:${key}`;
    const count = await client.incr(redisKey);
    if (count === 1) await client.pExpire(redisKey, windowMs);
    return count > limit;
  } catch {
    return memIsRateLimited(key, limit, windowMs);
  } finally {
    await client.disconnect().catch(() => {});
  }
}

async function redisResetRateLimit(key: string): Promise<void> {
  const url = process.env.REDIS_URL;
  if (!url) { memResetRateLimit(key); return; }

  const { createClient } = await import("redis");
  const client = createClient({ url });
  try {
    await client.connect();
    await client.del(`rl:${key}`);
  } catch {
    memResetRateLimit(key);
  } finally {
    await client.disconnect().catch(() => {});
  }
}

// ─── API publique ────────────────────────────────────────────────────────────

export async function isRateLimited(
  key: string,
  limit: number,
  windowMs = 15 * 60 * 1000
): Promise<boolean> {
  // 1) Upstash REST si configuré (rapide en serverless)
  const up = await getUpstash();
  if (up) {
    try {
      const k = `rl:${key}`;
      const count: number = await up.incr(k);
      if (count === 1) await up.pexpire(k, windowMs);
      return count > limit;
    } catch {
      // bascule vers Redis TCP / mémoire en cas d'erreur réseau
    }
  }
  // 2) Redis TCP (REDIS_URL) sinon mémoire
  return redisIsRateLimited(key, limit, windowMs);
}

export async function resetRateLimit(key: string): Promise<void> {
  const up = await getUpstash();
  if (up) {
    try {
      await up.del(`rl:${key}`);
      return;
    } catch {
      // bascule ci-dessous
    }
  }
  return redisResetRateLimit(key);
}
