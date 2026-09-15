# TASK-003.6 — Final Foundation Review — Laporan

**Tanggal:** 2026-09-15 · **Pemicu:** review teknis lanjutan (TASK-003.5 dinilai 9/10, 3 hal tersisa)
**Cakupan:** finalisasi fondasi — TANPA TASK-004, TANPA endpoint Paperclip, tanpa mengubah V1.

## 1. Docker migration ownership (HIGH) — DIPERBAIKI

- Mount `./db/migrations:/docker-entrypoint-initdb.d:ro` **DIHAPUS** dari
  `docker-compose.yml` — tidak ada lagi dua mekanisme migrasi.
- **Satu mekanisme kanonik**: `npm run db:migrate` (`scripts/db-migrate.mjs`)
  dengan tracking `schema_migrations`. Urutan deploy:
  `postgres healthy → db:migrate → app start` (dicatat di header compose).

## 2. Verifikasi migrasi — matriks lengkap (PostgreSQL 16 asli via Neon)

Docker tidak terpasang di mesin dev ini; **fresh database** diverifikasi lewat
database kedua sungguhan di Neon (`sofia_fresh_test`, dibuat + di-drop untuk uji).
Mekanisme yang diuji identik (runner + Postgres), bukan simulasi.

| Skenario | Hasil |
|---|---|
| Fresh DB, run-1 | ✅ `diterapkan=4, tercatat=4` (init penuh via runner kanonik) |
| Fresh DB, run-2 | ✅ `dilewati=4` (skip, checksum sama) |
| Existing/main DB (sudah dimigrasi) | ✅ `dilewati=4` |
| Checksum tamper (edit 001) | ✅ `GAGAL exit 1` + instruksi buat file baru (dari TASK-003.5) |
| **Migrasi gagal = rollback** | ✅ migrasi 900 (CREATE valid + INSERT invalid) → `GAGAL exit 1`; verifikasi: `PROBE_TABLE_ABSENT=true` (CREATE ikut ter-roll back — atomik), `TRACKING_900_ABSENT=true`, DB tetap 16 tabel bersih |

Skrip uji sementara (`.tmp-dbops.mjs`) dihapus setelah uji; DB uji di-drop.

## 3. System health ≠ Dependency readiness (poin review §4)

- **Implementasi aditif**: `systemHealth()` (tier critical saja) di registry;
  `/api/health/services` kini mengembalikan `system` + `status` (readiness).
  Bentuk lama tetap utuh — tidak ada consumer yang pecah.
- Live test: **`SYSTEM=healthy | READINESS=degraded`** — server SOFIA sehat
  (database online) meski Paperclip/9Router belum dikonfigurasi. Dashboard
  tidak lagi menampilkan "SOFIA SYSTEM = DEGRADED" untuk kapabilitas yang
  sengaja belum disetup. Konsep lengkap: `docs/current-architecture.md` §4.

## 4. Test suite — status jujur

**TEST SUITE: NOT IMPLEMENTED** (TASK-016). `npm test` masih placeholder —
pesan script diganti agar eksplisit: *"TEST SUITE: NOT IMPLEMENTED … BUKAN
tests PASS"*. Semua laporan TASK ini TIDAK mengklaim tests passed. Yang
dilaporkan sebagai validasi adalah: `typecheck` (exit 0), `lint` (1 warning
pre-existing V1), `build` (exit 0), dan uji migrasi/boot live di atas.

## 5. Yang TIDAK dilakukan (sesuai instruksi)

- Tidak ada TASK-004, tidak ada endpoint Paperclip, tidak ada integrasi baru.
- `store.ts`, `engine.ts`, `paper-engine.ts`, `risk-engine.ts`, `backtest.ts`,
  `indicators.ts`, `strategies.ts`, `decision.ts` — **utuh, tidak disentuh**.
- Tier tetap: database=critical; paperclip/router=required; hermes=required
  (pending s/d TASK-005); openrouter/local_llm/n8n/redis=optional.

## Files changed

`docker-compose.yml` (mount dihapus) · `src/lib/services/registry.ts` (`systemHealth`) ·
`src/app/api/health/services/route.ts` (field `system`, aditif) · `package.json`
(pesan test jujur) · `docs/current-architecture.md` (§4 dua konsep health) ·
`docs/task-003.6.md` (file ini).

## Remaining risks

1. Fresh-DB test memakai database kedua Neon, bukan container Docker lokal
   (Docker tidak terpasang di mesin ini) — mekanisme sama, host berbeda.
2. Urutan `build` → `typecheck` wajib di lingkungan ini: `tsc` membaca
   `.next/types/**`; `.next` basi memicu error TS6053 semu (pernah muncul,
   bukan bug kode; CI nanti: build dulu atau bersihkan `.next`).
3. `npm test` tetap placeholder sampai TASK-016 (test runner + suite nyata).
4. Docker production: hapus `ports` DB/Redis sepenuhnya (sudah didokumentasikan;
   bind loopback hanya untuk dev).

**STATUS: TASK-003.6 SELESAI — BERHENTI DI SINI. TASK-004 tidak dimulai
sebelum lampu hijau dari review berikutnya.**
