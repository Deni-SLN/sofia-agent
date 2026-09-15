// ============================================================
// SOFIA 2.0 — Postgres snapshot store, bagian 2: load (TASK-003)
// Boot invariant V1 dipertahankan: engine selalu STOPPED + halt
// dibersihkan walau baris engine_state menyimpan RUNNING.
// ============================================================

import type { SofiaStore } from "@/lib/core/store";
import { getPool } from "./pool";
import { PG_GLOBAL_ID } from "./snapshot-save";

/** Ambil angka aman dari unknown (numeric pg bisa string). */
function num(v: unknown, fb = 0): number {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : fb;
}

/** Muat snapshot Postgres ke store in-memory. */
export async function loadSnapshotPg(s: SofiaStore): Promise<boolean> {
  const pool = getPool();
  if (!pool) return false;
  try {
    const eng = await pool.query(`SELECT * FROM engine_state WHERE id=$1`, [PG_GLOBAL_ID]);
    if (eng.rowCount === 0) return false;
    const e = eng.rows[0] as Record<string, unknown>;
    s.mode = (e.mode as SofiaStore["mode"]) ?? s.mode;
    s.startedAt = (e.started_at as string | null) ?? null;
    s.liveUnlocked = Boolean(e.live_unlocked);
    // Equity dihitung ulang dari balance + unrealized (paper-engine),
    // bukan dari kolom DB — kolom hanya arsip observabilitas.
    s.account.balanceUsd = num(e.balance_usd, s.account.balanceUsd);

    const orders = await pool.query(`SELECT * FROM trade_orders ORDER BY created_at DESC LIMIT 200`);
    s.orders = orders.rows.map((r) => {
      const x = r as Record<string, unknown>;
      return {
        id: String(x.id), symbol: String(x.symbol), side: x.side, type: x.type,
        qty: num(x.qty), price: x.price == null ? null : num(x.price),
        stopLoss: x.stop_loss == null ? null : num(x.stop_loss),
        takeProfit: x.take_profit == null ? null : num(x.take_profit),
        status: x.status, filledQty: num(x.filled_qty),
        avgFillPrice: x.avg_fill_price == null ? null : num(x.avg_fill_price),
        feeUsd: num(x.fee_usd), slippageUsd: num(x.slippage_usd),
        signalId: (x.signal_id as string | null) ?? null, reason: String(x.reason ?? ""),
        createdAt: String(x.created_at), filledAt: (x.filled_at as string | null) ?? null,
      };
    }) as SofiaStore["orders"];

    const pos = await pool.query(
      `SELECT * FROM trade_positions WHERE status='OPEN' ORDER BY opened_at DESC LIMIT 200`
    );
    s.positions = pos.rows.map((r) => {
      const x = r as Record<string, unknown>;
      return {
        id: String(x.id), symbol: String(x.symbol), side: x.side, qty: num(x.qty),
        entryPrice: num(x.entry_price), currentPrice: num(x.current_price),
        takeProfit: x.take_profit == null ? null : num(x.take_profit),
        stopLoss: x.stop_loss == null ? null : num(x.stop_loss),
        trailingStopPct: x.trailing_stop_pct == null ? null : num(x.trailing_stop_pct),
        trailingStopPrice: x.trailing_stop_price == null ? null : num(x.trailing_stop_price),
        peakPrice: num(x.peak_price), unrealizedPnl: num(x.unrealized_pnl),
        realizedPnl: x.realized_pnl == null ? null : num(x.realized_pnl),
        feeUsd: num(x.fee_usd), signalId: (x.signal_id as string | null) ?? null,
        strategy: String(x.strategy ?? ""), marketRegime: x.market_regime,
        status: x.status, openedAt: String(x.opened_at),
        closedAt: (x.closed_at as string | null) ?? null,
        closePrice: x.close_price == null ? null : num(x.close_price),
        closeReason: (x.close_reason as string | null) ?? null,
      };
    }) as SofiaStore["positions"];

    const jr = await pool.query(`SELECT raw FROM journal_entries ORDER BY created_at DESC LIMIT 500`);
    s.journal = jr.rows.map((r) => (r as { raw: unknown }).raw) as SofiaStore["journal"];

    const sg = await pool.query(`SELECT * FROM trade_signals ORDER BY created_at DESC LIMIT 50`);
    s.signals = sg.rows.map((r) => {
      const x = r as Record<string, unknown>;
      const parse = (v: unknown, fb: unknown) => {
        try { return typeof v === "string" ? JSON.parse(v) : (v ?? fb); } catch { return fb; }
      };
      return {
        id: String(x.id), symbol: String(x.symbol), action: x.action, confidence: num(x.confidence),
        entry: num(x.entry_price), stopLoss: num(x.stop_loss), takeProfit: num(x.take_profit),
        riskReward: num(x.risk_reward), strategy: String(x.strategy ?? ""),
        marketRegime: x.market_regime, invalidation: String(x.invalidation ?? ""),
        scores: parse(x.scores, null), reasons: parse(x.reasons, []),
        state: x.state, mode: x.mode, createdAt: String(x.created_at),
      };
    }) as SofiaStore["signals"];

    // Boot invariant V1: engine selalu STOPPED + halt dibersihkan.
    s.engineState = "STOPPED";
    s.halted = false;
    s.haltedReason = null;
    return true;
  } catch (err) {
    console.warn(`[db] loadSnapshotPg gagal: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}
