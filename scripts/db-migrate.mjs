// ============================================================
// SOFIA 2.0 — scripts/db-migrate.mjs (TASK-003.5 / PRD §57)
// Migration runner dengan TRACKING nyata:
//   schema_migrations(version, name, checksum, applied_at)
// - file yang sudah diterapkan (checksum sama) -> DI-LEWATI
// - file yang diedit setelah diterapkan (checksum beda) -> GAGAL JELAS
//   (aturan: buat file migrasi BARU, jangan edit yang sudah jalan)
// - penerapan atomik: SQL + record tracking dalam SATU transaksi
// - tetap idempotent: file 001-004 lama tanpa record akan
//   diterapkan sekali lalu tercatat (aman, semua IF NOT EXISTS)
// Pakai: npm run db:migrate
// ============================================================
/* eslint-disable no-console */
import { createHash } from "node:crypto";
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
    if (!(k in process.env)) out[k] = v;
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

// TLS produksi-aman (TASK-003.5): verifikasi sertifikat ON by default.
// Escape hatch dev self-signed: PG_SSL_REJECT_UNAUTHORIZED=false (eksplisit).
const rejectUnauthorized =
  (process.env.PG_SSL_REJECT_UNAUTHORIZED ?? env.PG_SSL_REJECT_UNAUTHORIZED ?? "true") !== "false";
let sslmode = "";
try { sslmode = new URL(url).searchParams.get("sslmode") ?? ""; } catch { /* biarkan pool */ }
const wantsTls =
  sslmode !== "disable" &&
  (["require", "prefer", "verify-ca", "verify-full"].includes(sslmode) ||
    (!sslmode && /neon\.tech/i.test(url)));
const pool = new pg.Pool({
  connectionString: url,
  max: 2,
  connectionTimeoutMillis: 15000,
  ssl: wantsTls ? { rejectUnauthorized } : undefined,
});

const dir = join(process.cwd(), "db", "migrations");
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const sha256 = (s) => createHash("sha256").update(s, "utf8").digest("hex").slice(0, 16);

try {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       version    text PRIMARY KEY,
       name       text NOT NULL,
       checksum   text NOT NULL,
       applied_at timestamptz NOT NULL DEFAULT now()
     )`
  );
  let applied = 0, skipped = 0;
  for (const f of files) {
    const m = /^(\d+)_/.exec(f);
    if (!m) {
      console.error(`[db-migrate] Nama file harus diawali nomor versi (contoh 005_nama.sql): ${f}`);
      process.exitCode = 1;
      break;
    }
    const version = m[1];
    const sql = readFileSync(join(dir, f), "utf8");
    const checksum = sha256(sql);
    const row = await pool.query(`SELECT checksum FROM schema_migrations WHERE version = $1`, [version]);
    if (row.rowCount > 0) {
      if (row.rows[0].checksum === checksum) {
        console.log(`[db-migrate] ${f} ... LEWATI (sudah diterapkan, checksum sama)`);
        skipped++;
        continue;
      }
      console.error(
        `[db-migrate] GAGAL: migrasi ${version} sudah diterapkan dengan isi BERBEDA (checksum ${row.rows[0].checksum} != ${checksum}).\n` +
        `             Jangan edit migrasi yang sudah jalan — buat file BARU (mis. 005_...) agar riwayat tetap benar.`
      );
      process.exitCode = 1;
      break;
    }
    process.stdout.write(`[db-migrate] ${f} ... `);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(
        `INSERT INTO schema_migrations (version, name, checksum) VALUES ($1,$2,$3)`,
        [version, f, checksum]
      );
      await client.query("COMMIT");
      console.log("OK (tercatat di schema_migrations)");
      applied++;
    } catch (err) {
      try { await client.query("ROLLBACK"); } catch { /* abaikan */ }
      throw err;
    } finally {
      client.release();
    }
  }
  const done = await pool.query(`SELECT version, name FROM schema_migrations ORDER BY version`);
  console.log(
    `[db-migrate] SELESAI. diterapkan=${applied}, dilewati=${skipped}, total tercatat=${done.rowCount}` +
    ` (${done.rows.map((r) => r.version).join(", ")})`
  );
} catch (err) {
  console.error(`[db-migrate] GAGAL: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}


