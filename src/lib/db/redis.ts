// ============================================================
// SOFIA 2.0 — Redis client (TASK-003 / PRD §40)
// Cache + queue + pub/sub. Tanpa REDIS_URL → client null dan
// pemanggil memakai fallback memori (fungsi tetap aman).
// ============================================================

import Redis from "ioredis";

const g = globalThis as unknown as { __sofiaRedis?: Redis | null };

export function getRedis(): Redis | null {
  if (g.__sofiaRedis !== undefined) return g.__sofiaRedis;
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    g.__sofiaRedis = null;
    return null;
  }
  try {
    const r = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
    });
    r.on("error", (err) => console.warn(`[redis] ${String(err?.message || err)}`));
    g.__sofiaRedis = r;
    return r;
  } catch (err) {
    console.warn(`[redis] gagal init: ${String(err)}`);
    g.__sofiaRedis = null;
    return null;
  }
}

export function isRedisConfigured(): boolean {
  return Boolean(process.env.REDIS_URL?.trim());
}

/** Cache get/set JSON dengan TTL. Fallback null bila Redis mati. */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const r = getRedis();
  if (!r) return null;
  try {
    const raw = await r.get(`sofia:${key}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSec = 300): Promise<boolean> {
  const r = getRedis();
  if (!r) return false;
  try {
    await r.set(`sofia:${key}`, JSON.stringify(value), "EX", ttlSec);
    return true;
  } catch {
    return false;
  }
}
