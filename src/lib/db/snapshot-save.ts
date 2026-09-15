// ============================================================
// SOFIA 2.0 — Postgres snapshot store, bagian 1: save (TASK-003)
// Bentuk payload SAMA dengan persistence.ts V1 agar kompatibel.
// Engine memakai fungsi ini bila DATABASE_URL ada; bila tidak,
// fallback ke Supabase/no-op V1.
// ============================================================

import type { SofiaStore } from "@/lib/core/store";
import { equityOf } from "@/lib/core/paper-engine";
import { getPool } from "./pool";

export const PG_GLOBAL_ID = "global";

function toJson(v: unknown): string {
  return JSON.stringify(v ?? null);
}

/** Simpan seluruh slice store V1 ke Postgres (upsert per tabel). */
export async function saveSnapshotPg(s: SofiaStore): Promise<boolean> {
  const pool = getPool();
  if (!pool) return false;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO engine_state (id, engine_state, mode, started_at, halted, halted_reason, live_unlocked, equity_usd, balance_usd)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO UPDATE SET engine_state=EXCLUDED.engine_state, mode=EXCLUDED.mode,
         started_at=EXCLUDED.started_at, halted=EXCLUDED.halted, halted_reason=EXCLUDED.halted_reason,
         live_unlocked=EXCLUDED.live_unlocked, equity_usd=EXCLUDED.equity_usd, balance_usd=EXCLUDED.balance_usd`,
      [
        PG_GLOBAL_ID, s.engineState, s.mode, s.startedAt, s.halted, s.haltedReason,
        s.liveUnlocked, equityOf(s), s.account.balanceUsd ?? 0,
      ]
    );
    for (const o of s.orders.slice(0, 200)) {
      await client.query(
        `INSERT INTO trade_orders (id, symbol, side, type, qty, price, stop_loss, take_profit, status,
          filled_qty, avg_fill_price, fee_usd, slippage_usd, signal_id, reason, created_at, filled_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status, filled_qty=EXCLUDED.filled_qty,
           avg_fill_price=EXCLUDED.avg_fill_price, filled_at=EXCLUDED.filled_at`,
        [o.id, o.symbol, o.side, o.type, o.qty, o.price, o.stopLoss, o.takeProfit, o.status,
         o.filledQty, o.avgFillPrice, o.feeUsd, o.slippageUsd, o.signalId, o.reason, o.createdAt, o.filledAt]
      );
    }
    for (const p of s.positions.slice(0, 200)) {
      await client.query(
        `INSERT INTO trade_positions (id, symbol, side, qty, entry_price, current_price, take_profit, stop_loss,
          trailing_stop_pct, trailing_stop_price, peak_price, unrealized_pnl, realized_pnl, fee_usd,
          signal_id, strategy, market_regime, status, opened_at, closed_at, close_price, close_reason)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
         ON CONFLICT (id) DO UPDATE SET current_price=EXCLUDED.current_price, unrealized_pnl=EXCLUDED.unrealized_pnl,
           status=EXCLUDED.status, closed_at=EXCLUDED.closed_at, close_price=EXCLUDED.close_price,
           close_reason=EXCLUDED.close_reason, realized_pnl=EXCLUDED.realized_pnl`,
        [p.id, p.symbol, p.side, p.qty, p.entryPrice, p.currentPrice, p.takeProfit, p.stopLoss,
         p.trailingStopPct, p.trailingStopPrice, p.peakPrice, p.unrealizedPnl, p.realizedPnl, p.feeUsd,
         p.signalId, p.strategy, p.marketRegime, p.status, p.openedAt, p.closedAt, p.closePrice, p.closeReason]
      );
    }
    for (const j of s.journal.slice(0, 500)) {
      await client.query(
        `INSERT INTO journal_entries (id, trade_id, symbol, mode, strategy, market_regime, scores, entry_price,
          stop_loss, take_profit, qty, risk_usd, fee_usd, slippage_usd, reasoning, evidence, result,
          pnl, pnl_pct, duration_ms, confidence, raw, created_at, closed_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
         ON CONFLICT (id) DO UPDATE SET result=EXCLUDED.result, pnl=EXCLUDED.pnl, closed_at=EXCLUDED.closed_at,
           raw=EXCLUDED.raw`,
        [j.id, j.tradeId, j.symbol, j.mode, j.strategy, j.marketRegime, toJson(j.scores), j.entry,
         j.stopLoss, j.takeProfit, j.qty, j.riskUsd, j.feeUsd, j.slippageUsd, j.reasoning, toJson(j.evidence),
         j.result, j.pnl, j.pnlPct, j.durationMs, j.confidence, toJson(j), j.createdAt, j.closedAt]
      );
    }
    for (const sg of s.signals.slice(0, 50)) {
      await client.query(
        `INSERT INTO trade_signals (id, symbol, action, confidence, entry_price, stop_loss, take_profit,
          risk_reward, strategy, market_regime, invalidation, scores, reasons, state, mode, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         ON CONFLICT (id) DO NOTHING`,
        [sg.id, sg.symbol, sg.action, sg.confidence, sg.entry, sg.stopLoss, sg.takeProfit,
         sg.riskReward, sg.strategy, sg.marketRegime, sg.invalidation, toJson(sg.scores),
         toJson(sg.reasons), sg.state, sg.mode, sg.createdAt]
      );
    }
    await client.query("COMMIT");
    return true;
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch { /* abaikan */ }
    console.warn(`[db] saveSnapshotPg gagal: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  } finally {
    client.release();
  }
}
