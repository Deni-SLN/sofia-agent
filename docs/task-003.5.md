# TASK-003.5 — Foundation Hardening — Laporan

**Tanggal:** 2026-09-15 · **Pemicu:** review teknis manual (audit ZIP, bukan laporan agent)
**Cakupan:** perbaikan fondasi TASK-002/003 — TANPA TASK-004, TANPA menghapus kode V1.

## Files changed

| File | Perubahan |
|---|---|
| `scripts/db-migrate.mjs` | **Migration tracking nyata**: `schema_migrations(version, name, checksum, applied_at)`; skip yang sudah jalan; GAGAL jelas bila checksum berubah; apply atomik (SQL + record 1 transaksi) |
| `src/lib/db/migrate.ts` | DIHAPUS — runner duplikat; kanonik = `db-migrate.mjs` (tanpa importer) |
| `src/lib/db/pool.ts` | TLS: `rejectUnauthorized` **ON by default**; helper `sslFor()` (sslmode=disable→no TLS; escape hatch dev eksplisit) |
| `scripts/migrate-supabase.mjs` | TLS sama seperti pool |
| `src/lib/services/types.ts` | `ServiceStatus` + `"pending"`; `ServiceTier` (critical/required/optional); `tier` di kontrak |
| `src/lib/services/registry.ts` | Tier map 8 layanan + `overallStatus()` berbasis tier |
| `src/lib/services/hermes.ts` | Health palsu "degraded" → `"pending"` (jujur, netral) s/d TASK-005 |
| `src/app/api/health/services/route.ts` | Dedupe `overallStatus` (bentuk respons tetap) |
| `docker-compose.yml` | DB/Redis **loopback-only**; header DEV vs PRODUKSI; password dev ditandai |
| `src/lib/core/persistence.ts` | Kontrak semantik: single active store, legacy compatibility, bukan failover |
| `.env.example` | `PG_SSL_REJECT_UNAUTHORIZED` + catatan password produksi |
| `docs/current-architecture.md` | BARU — kondisi terkini (pelengkap baseline audit.md) |
| `docs/task-003.md` | Status diperjelas: foundation selesai, domain migration menyusul per fase |

## Migration changes

- Sebelum: semua SQL dieksekusi ulang tiap run (aman kebetulan karena `IF NOT EXISTS`).
- Sesudah: tracking nyata. Live test Neon:
  1. Run-1: `diterapkan=4, tercatat=4` (backfill 001–004, idempotent).
  2. Run-2: `diterapkan=0, dilewati=4` (**LEWATI — checksum sama**).
  3. Tamper test: edit 001 → **GAGAL exit 1** `checksum 7f69… != d9f5…` dengan instruksi buat file baru; restore → normal.
- 16 tabel kini (15 + `schema_migrations`).

## Health changes

- Overall dihitung dari **critical+required saja**. Live test (dev, hanya Neon terisi):
  `database=critical/online`, `paperclip|hermes|router=required/unconfigured` →
  overall `degraded` (jujur). Optional (`openrouter, local_llm, n8n, redis`)
  unconfigured **tidak** lagi membuat SOFIA tampak sakit.
- Hermes tidak lagi memalsukan `"degraded"`; akan `"pending"` sampai TASK-005.

## Security changes

- Verifikasi sertifikat TLS Postgres **ON** di pool + 2 script (sebelumnya `rejectUnauthorized:false`); teruji live ke Neon tanpa escape hatch.
- Docker: DB/Redis tidak dipublish selain loopback; dokumentasi produksi (password kuat, hapus ports, reverse proxy TLS).

## Tests performed

`npm run typecheck` ✅ 0 · `next lint` ✅ (1 warning **pre-existing V1** useEffect, bukan file baru) · `npm run build` ✅ · `npm run db:migrate` ✅ ×3 (apply/skip/tamper-fail) · boot `npm start` + `/api/health/services` ✅ semantik baru terverifikasi.

## Remaining risks

1. Supabase masih jalan untuk auth (dihapus TASK-017).
2. Skema domain penuh PRD menyusul per fase (11–15) — disengaja.
3. `legacy_snapshots` = safety copy migrasi, bukan backup; backup nyata = `pg_dump` terjadwal (TASK-016).
4. `memory.embedding` jsonb — cukup utk MVP; pgvector saat TASK-011 bila semantic search jadi kebutuhan.
5. Snapshot-store masih bridge V1 → repository per fase (tidak big-bang, sesuai §65).
