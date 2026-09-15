# TASK-003 — PostgreSQL Migration (Neon) — Laporan

**Tanggal:** 2026-09-15 · **PRD:** §39 (data), §40 (Redis), §57 (Supabase→PostgreSQL), §58 (Docker core), §64 (backup)
**Status:** **FOUNDATION selesai** + tervalidasi live. Domain migration penuh PRD
(portfolio/transactions/backtests/decision_evidence/dll) dibuat pada fase masing-masing
(TASK-011..015) — disepakati review TASK-003.5. Hardening lanjutan:
`docs/task-003.5.md`. Commit lokal — push ditahan atas permintaan user.

## 1. Ringkasan

Persistensi V1 (Supabase snapshot-blob) diganti ke **PostgreSQL** dengan target aktif
**Neon** (serverless Postgres, pooler TLS). Supabase **tidak dihapus** — menjadi fallback
otomatis (PRD §57: hapus belakangan, setelah data terverifikasi). Engine V1, API lama, dan
UI tidak berubah perilaku.

## 2. Skema (db/migrations/, idempotent, 15 tabel)

| File | Tabel |
|---|---|
| 001_sofia_core | `engine_state`, `trade_orders` |
| 002_trading | `trade_positions`, `journal_entries`, `trade_signals` |
| 003_memory | `memory_entries`, `knowledge_docs`, `decisions` (PRD §21-23) |
| 004_system | `ai_requests`, `ai_costs` (§19-20), `audit_events` (§44), `users`, `api_keys` (fondasi TASK-017), `ai_provider_state`, `legacy_snapshots` (backup) |

Trigger `sofia_touch_updated_at()` untuk `updated_at` otomatis. Index di kolom query panas.

## 3. Lapisan akses (src/lib/db/)

- `pool.ts` — pool `pg` per proses (HMR-safe), **SSL otomatis untuk Neon/sslmode=require**;
  tanpa `DATABASE_URL` → null → fallback memori/Supabase (tidak pernah crash).
- `snapshot-save.ts` / `snapshot-load.ts` — simpan/muat slice store V1 (orders/positions/
  journal/signals/engine_state). **Boot invariant dipertahankan:** engine selalu boot
  `STOPPED` + halt dibersihkan.
- `journal-repo.ts` — arsip jurnal per trade (upsert).
- `ai-ledger.ts` — ledger AI per request + agregat harian (sumber tunggal; duplikat
  `ai-usage-repo.ts` dihapus per §56). `aiUsageSummary()` → Postgres bila ada, memori bila tidak.
- `audit-repo.ts` — 13 event audit §44: selalu ke logger terstruktur + ke `audit_events`
  bila DB ada. Sudah dipanggil engine (`TRADING_STARTED`/`TRADING_STOPPED`).
- `redis.ts` — client opsional (`REDIS_URL`), cache get/set TTL dengan fallback aman.
- `migrate.ts` + `scripts/db-migrate.mjs` — runner idempotent; script mandiri (baca
  `.env.local`, `pg` langsung, tanpa tsx). **Perintah: `npm run db:migrate`.**

## 4. Routing persistence (src/lib/core/persistence.ts)

```
DATABASE_URL (Neon) ada  -> saveSnapshotPg / loadSnapshotPg / archiveJournalPg
DATABASE_URL kosong      -> Supabase V1 (kode utuh, fallback)
keduanya gagal           -> no-op, engine in-memory tetap jalan
```

`ai-router.ts` kini menulis setiap request LLM (sukses/cache/gagal) ke ledger via
fire-and-forget — tidak pernah memengaruhi latency routing.

## 5. Konfigurasi Neon

- URL Neon (dengan `sslmode=require`) disimpan di **`.env.local`** (gitignored — secret
  tidak pernah di-commit; aturan §65). `.env.example` hanya berisi placeholder bentuk Neon.
- Docker compose: `DATABASE_URL` eksternal menang; fallback Postgres lokal `postgres` service.
- Memindah ke Postgres self-hosted Proxmox nanti = ganti satu baris `DATABASE_URL`.

## 6. Migrasi data Supabase → Postgres (PRD §57, §64)

`scripts/migrate-supabase.mjs`: (1) baca `sofia_snapshots` + `sofia_journal`;
(2) **BACKUP RAW utuh ke `legacy_snapshots`** dulu; (3) normalisasi ke tabel inti dengan
`ON CONFLICT DO NOTHING` (idempotent, boleh diulang). Tanpa env Supabase → exit 0 (0
perubahan). Jalankan: `node scripts/migrate-supabase.mjs` setelah env Supabase diisi.

## 7. Docker (PRD §58)

`Dockerfile` (node:20-alpine, 3 stage) + `.dockerignore` + `docker-compose.yml`:
**hanya core stack** — `sofia` + `postgres` + `redis` (migrasi auto dijalankan saat init
DB via mount `docker-entrypoint-initdb.d`). Paperclip/Hermes/9Router/n8n sengaja TIDAK
dibundle (§58) — dikonsumsi via API.

## 8. Validasi (PRD §65)

| Cek | Hasil |
|---|---|
| `tsc --noEmit` | ✅ exit 0 |
| `next lint` (db/core/services) | ✅ No warnings or errors |
| `npm run build` | ✅ exit 0, semua route |
| `npm run db:migrate` → Neon | ✅ 4 file OK, **15 tabel** |
| Boot `npm start` + `/api/health` | ✅ `ok:true`, engine STOPPED (tidak berubah) |
| `/api/health/services` | ✅ **database: online (19ms)**; lainnya `unconfigured` (API key belum diisi — wajar) |
| Redis | `unconfigured` (opsional; `docker compose up -d redis` bila perlu) |

## 9. Sisa pekerjaan / catatan

- `src/lib/db/migrate.ts` dipertahankan sebagai runner bertipe untuk pemakaian in-app.
- Warning pg `sslmode` (verify-full alias) — informatif, tidak memengaruhi koneksi.
- Supabase baru dihapus di fase TASK-017 (auth lokal) setelah data & periode paralel aman.
- **Backup harian** (§64): `pg_dump $DATABASE_URL` — jadwalkan via n8n/cron di fase TASK-016.
- **Lanjut: TASK-004 Paperclip Client** (typed client: agents/projects/tasks/goals/runs/activity).
