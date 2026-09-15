// SOFIA 2.0 — PostgreSQL contract (TASK-002 / PRD §39, §57).
// Fase fondasi: hanya cek konfigurasi DATABASE_URL (tanpa driver).
// Migrasi + koneksi nyata di TASK-003. Supabase V1 tetap jalan.
import type { ServiceCheckResult, ServiceClient } from "./types";
import { getServerConfig } from "@/lib/config/server";

export class PostgresClient implements ServiceClient {
  readonly name = "database";
  async check(): Promise<ServiceCheckResult> {
    const cfg = getServerConfig();
    if (!cfg.postgres.configured)
      return { status: "unconfigured", latencyMs: null, detail: "DATABASE_URL belum dikonfigurasi (migrasi TASK-003)" };
    return { status: "degraded", latencyMs: null, detail: "DATABASE_URL terkonfigurasi; koneksi live di TASK-003" };
  }
}
