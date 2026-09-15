// ============================================================
// SOFIA Trade — Supabase persistence adapter (Fase 6)
// Best-effort: jika env Supabase belum diset, semua fungsi
// menjadi no-op agar engine in-memory tetap jalan (dev/demo).
// Tabel (lihat supabase/schema.sql):
//   sofia_snapshots(id, payload, updated_at) — 1 baris global
//   sofia_journal(id, entry) — arsip jurnal per trade
// ============================================================

import type { JournalEntry } from "./types";
import type { SofiaStore } from "./store";

const SNAPSHOT_ID = "global-v1";
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let lastErrorAt = 0;

function envOk(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

async function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const { createClient } = await import("@supabase/supabase-js");
  // Route server memakai service role bila ada (bypass RLS),
  // fallback ke anon key agar tetap jalan di dev.
  return createClient(url, service || anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function logThrottled(msg: string): void {
  const now = Date.now();
  if (now - lastErrorAt < 60_000) return;
  lastErrorAt = now;
  console.warn(`[persistence] ${msg}`);
}

export function isPersistenceEnabled(): boolean {
  return envOk();
}

/** Simpan snapshot store (debounced 2 detik). Fire-and-forget. */
export function saveSnapshotDebounced(s: SofiaStore): void {
  if (!envOk()) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void persistSnapshot(s), 2000);
}

export async function persistSnapshot(s: SofiaStore): Promise<boolean> {
  if (!envOk()) return false;
  try {
    const sb = await serviceClient();
    const payload = {
      engineState: s.engineState,
      mode: s.mode,
      startedAt: s.startedAt,
      halted: s.halted,
      haltedReason: s.haltedReason,
      account: s.account,
      orders: s.orders.slice(0, 200),
      positions: s.positions.slice(0, 200),
      journal: s.journal.slice(0, 500),
      signals: s.signals.slice(0, 50),
      events: s.events.slice(0, 100),
      candidates: s.candidates,
      lastScanAt: s.lastScanAt,
      riskConfig: s.riskConfig,
      watchlistMine: s.watchlistMine,
      watchlistSofia: s.watchlistSofia,
      stats: s.stats,
      notifications: s.notifications.slice(0, 200),
      strategies: s.strategies.slice(0, 100),
      prompts: s.prompts.slice(0, 100),
      savedAt: new Date().toISOString(),
    };
    const { error } = await sb
      .from("sofia_snapshots")
      .upsert({ id: SNAPSHOT_ID, payload });
    if (error) {
      logThrottled(`snapshot gagal: ${error.message}`);
      return false;
    }
    return true;
  } catch (e) {
    logThrottled(`snapshot error: ${String(e)}`);
    return false;
  }
}

/** Muat snapshot terakhir ke store in-memory (dipanggil sekali saat boot). */
export async function loadSnapshot(s: SofiaStore): Promise<boolean> {
  if (!envOk()) return false;
  try {
    const sb = await serviceClient();
    const { data, error } = await sb
      .from("sofia_snapshots")
      .select("payload")
      .eq("id", SNAPSHOT_ID)
      .maybeSingle();
    if (error || !data) return false;
    const p = (data as { payload?: Record<string, unknown> }).payload;
    if (!p || typeof p !== "object") return false;
    const get = <K extends keyof SofiaStore>(k: K, fb: SofiaStore[K]): SofiaStore[K] =>
      (p[k] as SofiaStore[K]) ?? fb;
    s.mode = get("mode", s.mode);
    s.startedAt = get("startedAt", s.startedAt);
    s.account = get("account", s.account);
    s.orders = get("orders", s.orders);
    s.positions = get("positions", s.positions);
    s.journal = get("journal", s.journal);
    s.signals = get("signals", s.signals);
    s.events = get("events", s.events);
    s.riskConfig = get("riskConfig", s.riskConfig);
    s.watchlistMine = get("watchlistMine", s.watchlistMine);
    s.watchlistSofia = get("watchlistSofia", s.watchlistSofia);
    s.stats = get("stats", s.stats);
    s.notifications = get("notifications", s.notifications);
    s.strategies = get("strategies", s.strategies);
    s.prompts = get("prompts", s.prompts);
    // Engine selalu boot STOPPED walau snapshot RUNNING (aman).
    s.engineState = "STOPPED";
    s.halted = false;
    s.haltedReason = null;
    return true;
  } catch {
    return false;
  }
}

/** Arsip satu entri jurnal (fire-and-forget). */
export function archiveJournal(entry: JournalEntry): void {
  if (!envOk()) return;
  void (async () => {
    try {
      const sb = await serviceClient();
      const { error } = await sb.from("sofia_journal").upsert({
        id: entry.id,
        trade_id: entry.tradeId,
        symbol: entry.symbol,
        mode: entry.mode,
        strategy: entry.strategy,
        result: entry.result,
        pnl: entry.pnl,
        entry: entry as unknown as Record<string, unknown>,
      });
      if (error) logThrottled(`arsip jurnal gagal: ${error.message}`);
    } catch (e) {
      logThrottled(`arsip jurnal error: ${String(e)}`);
    }
  })();
}
