// ============================================================
// SOFIA 2.0 — Postgres journal archive (TASK-003 / PRD §57)
// Arsip satu entri jurnal per trade (pengganti sofia_journal).
// Pemetaan kolom = snapshot-save.ts agar konsisten. Tidak throw.
// ============================================================

import type { JournalEntry } from "@/lib/core/types";
import { getPool } from "./pool";

function toJson(v: unknown): string {
  return JSON.stringify(v ?? null);
}

export async function archiveJournalPg(entry: JournalEntry): Promise<boolean> {
  const pool = getPool();
  if (!pool) return false;
  try {
    await pool.query(
      `INSERT INTO journal_entries (id, trade_id, symbol, mode, strategy, market_regime, scores, entry_price,
        stop_loss, take_profit, qty, risk_usd, fee_usd, slippage_usd, reasoning, evidence, result,
        pnl, pnl_pct, duration_ms, confidence, raw, created_at, closed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
       ON CONFLICT (id) DO UPDATE SET result=EXCLUDED.result, pnl=EXCLUDED.pnl,
         pnl_pct=EXCLUDED.pnl_pct, duration_ms=EXCLUDED.duration_ms,
         closed_at=EXCLUDED.closed_at, raw=EXCLUDED.raw`,
      [entry.id, entry.tradeId ?? null, entry.symbol, entry.mode, entry.strategy, entry.marketRegime,
       toJson(entry.scores), entry.entry, entry.stopLoss, entry.takeProfit, entry.qty, entry.riskUsd,
       entry.feeUsd, entry.slippageUsd, entry.reasoning, toJson(entry.evidence), entry.result,
       entry.pnl, entry.pnlPct, entry.durationMs, entry.confidence, toJson(entry),
       entry.createdAt, entry.closedAt]
    );
    return true;
  } catch (err) {
    console.warn(`[db] archiveJournalPg gagal: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}
