# SOFIA — Arsitektur Saat Ini (diperbarui TASK-003.5)

**Tanggal:** 2026-09-15 · **Baseline V1:** lihat `docs/audit.md` (audit baseline, bukan kondisi kini)
Dokumen ini menggambarkan kondisi repository **saat ini** (setelah TASK-002 + TASK-003 + hardening 003.5).

## 1. Bentuk runtime sekarang

```text
Browser (React 18)
   │  fetch /api/*
   ▼
Next.js middleware (Supabase Auth — legacy, sampai TASK-017)
   │
   ▼
src/app/api/**/route.ts (33 route V1 + /api/health/services baru)
   │
   ▼
src/lib/core/*          ← engine/store/risiko/paper V1 (DIPERTAHANKAN, §65)
   │        │
   │        └── persistence.ts (ROUTER penyimpanan — bridge evolusif)
   │                 │
   │      ┌──────────┴───────────┐
   │      ▼                      ▼
   │  src/lib/db/* (PostgreSQL)  Supabase V1 (LEGACY, single-active)
   │  pool/snapshot/journal/
   │  ai-ledger/audit/redis
   ▼
src/lib/services/*      ← 8 kontrak health (Paperclip/Hermes/9Router/
                           OpenRouter/LocalLLM/n8n/PostgreSQL/Redis)
src/lib/config/*        ← env server-only terpusat (tanpa NEXT_PUBLIC secret)
```

## 2. Penyimpanan — semantik tunggal (anti split-brain)

- `DATABASE_URL` (Neon) diset → **PostgreSQL satu-satunya store aktif**;
  Supabase tidak pernah ditulis. `DATABASE_URL` kosong → Supabase V1 aktif.
- Supabase = **legacy compatibility masa migrasi**, BUKAN failover/HA
  ( gagal koneksi → engine in-memory, bukan pindah store ).
- Snapshot save/load = bridge evolusif. Path final (per fase, tanpa big-bang):
  `Domain → Repository → PostgreSQL`, `store.ts` global dikurangi bertahap
  tanpa menghapus business logic V1.

## 3. Migrasi database

- Runner kanonik: `scripts/db-migrate.mjs` (`npm run db:migrate`).
- Tracking: tabel `schema_migrations(version, name, checksum, applied_at)`.
- Sudah diterapkan + checksum sama → **LEWATI**; file lama diedit → **GAGAL**
  (wajib buat file baru); SQL + record atomik dalam satu transaksi.
- 15 tabel inti + `schema_migrations`. Skema domain penuh PRD
  (portfolio/transactions/backtests/decision_evidence/dll) dibuat pada
  fase masing-masing (TASK-011..015) — TASK-003 = fondasi.

## 4. Health semantics (/api/health/services) — DUA KONSEP (TASK-003.6)

**System health ≠ Dependency readiness.**

| Field | Arti | Dihitung dari |
|---|---|---|
| `system` | Apakah server SOFIA sendiri sehat | Tier `critical` saja |
| `status` | Kesiapan dependensi/capability | Tier `critical` + `required` |

- `system=healthy` walaupun Paperclip/9Router sengaja belum dikonfigurasi —
  server tidak rusak; yang belum siap adalah kapabilitasnya.
- Tier: `critical` = database (offline → `system=down`);
  `required` = paperclip, hermes, router (unconfigured → readiness `degraded`);
  `optional` = openrouter, local_llm, n8n, redis (tidak memengaruhi keduanya).
- `pending` (Hermes s/d TASK-005) = integrasi belum dilakukan — netral, jujur.
- Contoh bentuk dashboard (TASK-009):
  `SYSTEM 🟢 ONLINE` + daftar capability per layanan.

## 5. Keamanan

- TLS Postgres: verifikasi sertifikat **ON** default (pg ≥8.11 sslmode=require
  = verify-full). Escape hatch dev self-signed: `PG_SSL_REJECT_UNAUTHORIZED=false`.
- Tanpa secret client-side; config server-only (`src/lib/config/server.ts`).
- Docker dev: DB/Redis loopback-only; produksi wajib password kuat tanpa default.

## 6. Evolution path (disepakati review TASK-003.5)

1. TASK-004 PaperclipClient typed (auth/timeout/retry/error-mapping/pagination/request-id).
2. TASK-005 Hermes visibility via Paperclip (status/task/heartbeat/last-run/last-error).
3. TASK-006+ 9Router gateway: chat/streaming/profile/fallback/usage/cost.
4. Domain migrations per fase; `memory.embedding` jsonb → pgvector saat TASK-011 bila perlu.
5. Backup produksi = `pg_dump` terjadwal (n8n/cron TASK-016); `legacy_snapshots`
   hanyalah migration safety copy, BUKAN strategi backup.
6. Supabase dependency dihapus sebelum/di TASK-017.
