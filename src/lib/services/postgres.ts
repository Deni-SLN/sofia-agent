// SOFIA 2.0 — PostgreSQL contract (TASK-003 / PRD §39, §57).
// Health check LIVE: SELECT 1 via pool. Tanpa DATABASE_URL →
// "unconfigured"; query gagal → "offline". Supabase V1 tetap jalan.
import type { ServiceCheckResult, ServiceClient } from "./types";
import { checkDb, isDbConfigured } from "@/lib/db/pool";

export class PostgresClient implements ServiceClient {
  readonly name = "database";
  async check(): Promise<ServiceCheckResult> {
    if (!isDbConfigured())
      return { status: "unconfigured", latencyMs: null, detail: "DATABASE_URL belum dikonfigurasi" };
    const r = await checkDb();
    if (r.ok) return { status: "online", latencyMs: r.latencyMs, detail: "PostgreSQL reachable (SELECT 1)" };
    return { status: "offline", latencyMs: r.latencyMs, detail: r.detail || "PostgreSQL tidak reachable" };
  }
}
