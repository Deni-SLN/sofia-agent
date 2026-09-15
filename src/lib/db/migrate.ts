// ============================================================
// SOFIA 2.0 — Migration runner (TASK-003 / PRD §57)
// Urutan: 001 -> 002 -> 003 -> 004. Idempotent (IF NOT EXISTS).
// Dipakai oleh scripts/db-migrate.mjs. Supabase V1 tidak diubah.
// ============================================================

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Pool } from "pg";

export const MIGRATIONS_DIR = join(process.cwd(), "db", "migrations");

export function listMigrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

/** Jalankan semua file migrasi berurutan dalam satu koneksi pool. */
export async function migrate(pool: Pool): Promise<string[]> {
  const files = listMigrationFiles();
  const applied: string[] = [];
  for (const f of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, f), "utf8");
    await pool.query(sql);
    applied.push(f);
  }
  return applied;
}
