// ============================================================
// SOFIA 2.0 — scripts/db-migrate.mjs (TASK-003 / PRD §57)
// Runner migrasi MANDIRI (tanpa tsx): baca .env.local -> jalankan
// db/migrations/*.sql berurutan via node-postgres. Idempotent.
// Pakai: npm run db:migrate   (atau DATABASE_URL=... node scripts/db-migrate.mjs)
// ============================================================
/* eslint-disable no-console */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

function loadEnvLocal() {
  const p = join(process.cwd(), ".env.local");
  if (!existsSync(p)) return {};
  const out = {};
  for (const raw of readFileSync(p, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(k in process.env)) out[k] = v; // env proses menang atas .env.local
  }
  return out;
}

const env = loadEnvLocal();
const url = process.env.DATABASE_URL || env.DATABASE_URL || "";
if (!url) {
  console.error("[db-migrate] DATABASE_URL tidak ditemukan (env proses atau .env.local).");
  process.exit(1);
}
const host = (() => { try { return new URL(url).host; } catch { return "(invalid-url)"; } })();
console.log(`[db-migrate] Target: ${host}${/neon\.tech/i.test(url) ? " (Neon)" : ""}`);

const needsSsl = /sslmode=(require|verify)|neon\.tech/i.test(url);
const pool = new pg.Pool({
  connectionString: url,
  max: 2,
  connectionTimeoutMillis: 15000,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
});

const dir = join(process.cwd(), "db", "migrations");
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
console.log(`[db-migrate] ${files.length} file: ${files.join(", ")}`);

try {
  for (const f of files) {
    const sql = readFileSync(join(dir, f), "utf8");
    process.stdout.write(`[db-migrate] ${f} ... `);
    await pool.query(sql);
    console.log("OK");
  }
  const t = await pool.query(
    `SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public'`
  );
  console.log(`[db-migrate] SELESAI. Tabel di schema public: ${t.rows[0].n}`);
} catch (err) {
  console.error(`[db-migrate] GAGAL: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}

