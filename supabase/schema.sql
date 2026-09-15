-- ============================================================
-- SOFIA Trade V1 — Supabase schema (Fase 6: persistensi)
-- Jalankan di Supabase SQL Editor (sekali).
-- Engine tetap jalan tanpa tabel ini (best-effort/no-op).
-- ============================================================

-- Snapshot global state engine (1 baris: id = 'global-v1')
create table if not exists public.sofia_snapshots (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Arsip jurnal per trade (upsert per id)
create table if not exists public.sofia_journal (
  id text primary key,
  trade_id text,
  symbol text not null default '',
  mode text not null default 'PAPER',
  strategy text not null default '',
  result text not null default 'OPEN',
  pnl numeric,
  entry jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists sofia_journal_symbol_idx on public.sofia_journal (symbol);
create index if not exists sofia_journal_result_idx on public.sofia_journal (result);

-- Izinkan akses service_role (bypass RLS default off) — RLS tetap
-- menyala tapi policy service_role implisit penuh. Untuk anon key
-- tanpa login, aktifkan policy baca/tulis terbatas ini:
alter table public.sofia_snapshots enable row level security;
alter table public.sofia_journal enable row level security;

drop policy if exists "sofia_snapshot_open" on public.sofia_snapshots;
create policy "sofia_snapshot_open" on public.sofia_snapshots
  for all using (true) with check (true);

drop policy if exists "sofia_journal_open" on public.sofia_journal;
create policy "sofia_journal_open" on public.sofia_journal
  for all using (true) with check (true);
