// SOFIA 2.0 — Redis contract (TASK-002 / PRD §40: cache + queue).
// Fase fondasi: hanya cek konfigurasi REDIS_URL (tanpa driver).
import type { ServiceCheckResult, ServiceClient } from "./types";
import { getServerConfig } from "@/lib/config/server";

export class RedisClient implements ServiceClient {
  readonly name = "redis";
  async check(): Promise<ServiceCheckResult> {
    const cfg = getServerConfig();
    if (!cfg.redis.configured)
      return { status: "unconfigured", latencyMs: null, detail: "REDIS_URL belum dikonfigurasi" };
    return { status: "degraded", latencyMs: null, detail: "REDIS_URL terkonfigurasi; koneksi live menyusul" };
  }
}
