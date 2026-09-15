// SOFIA 2.0 — Redis contract (TASK-003 / PRD §40: cache + queue).
// Health check LIVE: PING via ioredis lazy connection.
// Tanpa REDIS_URL → "unconfigured"; PING gagal → "offline".
import type { ServiceCheckResult, ServiceClient } from "./types";
import { getRedis, isRedisConfigured } from "@/lib/db/redis";

export class RedisClient implements ServiceClient {
  readonly name = "redis";
  async check(): Promise<ServiceCheckResult> {
    if (!isRedisConfigured())
      return { status: "unconfigured", latencyMs: null, detail: "REDIS_URL belum dikonfigurasi" };
    const r = getRedis();
    if (!r) return { status: "unconfigured", latencyMs: null, detail: "REDIS_URL belum dikonfigurasi" };
    const t0 = Date.now();
    try {
      const pong = await r.ping();
      if (String(pong).toUpperCase() === "PONG")
        return { status: "online", latencyMs: Date.now() - t0, detail: "Redis reachable (PING)" };
      return { status: "degraded", latencyMs: Date.now() - t0, detail: `Redis respons tak terduga: ${pong}` };
    } catch (err) {
      return {
        status: "offline",
        latencyMs: Date.now() - t0,
        detail: err instanceof Error ? err.message.slice(0, 200) : String(err),
      };
    }
  }
}
