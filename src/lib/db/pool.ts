// ============================================================
// SOFIA 2.0 — PostgreSQL pool (TASK-003 / PRD §39, §57)
// Server-only. Tanpa DATABASE_URL → pool null, repo jatuh ke
// mode memori (V1 tetap jalan). Satu pool per proses (HMR-safe).
// ============================================================

import { Pool } from "pg";

const g = globalThis as unknown as { __sofiaPgPool?: Pool | null; __sofiaPgWarned?: boolean };

function warnOnce(msg: string): void {
  if (g.__sofiaPgWarned) return;
  g.__sofiaPgWarned = true;
  console.warn(`[db] ${msg}`);
}

export function getPool(): Pool | null {
  if (g.__sofiaPgPool !== undefined) return g.__sofiaPgPool;
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    g.__sofiaPgPool = null;
    return null;
  }
  try {
    const pool = new Pool({
      connectionString: url,
      max: Number(process.env.PG_POOL_MAX || 5),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      // Neon pooler & endpoint TLS (sslmode=require) butuh ssl eksplisit.
      // Postgres lokal (docker compose) tanpa TLS tetap jalan (undefined).
      ssl: /sslmode=(require|verify)|neon\.tech/i.test(url)
        ? { rejectUnauthorized: false }
        : undefined,
    });
    pool.on("error", (err) => console.warn(`[db] pool error: ${String(err?.message || err)}`));
    g.__sofiaPgPool = pool;
    return pool;
  } catch (err) {
    warnOnce(`gagal membuat pool: ${String(err)}`);
    g.__sofiaPgPool = null;
    return null;
  }
}

/** True bila DATABASE_URL terkonfigurasi (belum tentu reachable). */
export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

/** Cek koneksi cepat. Tidak throw — kembalikan { ok, latencyMs, detail }. */
export async function checkDb(): Promise<{ ok: boolean; latencyMs: number | null; detail?: string }> {
  const pool = getPool();
  if (!pool) return { ok: false, latencyMs: null, detail: "DATABASE_URL belum dikonfigurasi" };
  const t0 = Date.now();
  try {
    await pool.query("SELECT 1");
    return { ok: true, latencyMs: Date.now() - t0 };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - t0,
      detail: err instanceof Error ? err.message.slice(0, 200) : String(err),
    };
  }
}
