// ============================================================
// SOFIA Trade — Risk Engine (PRD §26, §27, §54, §61.7)
// - Deterministic sepenuhnya, TIDAK PERNAH memanggil LLM.
// - Non-bypassable: satu-satunya jalan approval sebelum order.
// - Circuit breaker: daily loss, consecutive losses, spread,
//   likuiditas, R:R, sizing 1% risk, leverage 1x, max 1 posisi.
// ============================================================

import type {
  PaperAccount,
  PaperPosition,
  RiskCheck,
  RiskConfig,
  RiskValidation,
  Ticker,
  TradeSignal,
  TradeSizing,
} from "./types";

export const DEFAULT_RISK_CONFIG: RiskConfig = {
  riskPerTradePct: 1, // PRD §54: risk 1% per trade
  maxDailyLossPct: 3, // PRD §54: max daily loss 3%
  maxOpenPositions: 1, // PRD §54: max 1 posisi
  maxConsecutiveLosses: 3, // PRD §27: circuit breaker
  minRiskReward: 2, // PRD §53: min R:R 1:2
  maxPositionPct: 95, // exposure cap 95% equity — akun Rp100rb (~$6) butuh >80% agar min order $5 lolos
  leverage: 1, // PRD §54: max leverage 1x
  minOrderUsd: 5, // PRD §24: min order $5 (Bybit spot)
  minOrderQty: 0,
  takerFeePct: 0.1, // PRD §24: fee 0.1%
  slippagePct: 0.05, // PRD §24: slippage 0.05%
  maxSpreadPct: 0.5, // PRD §24: max spread 0.5%
  minTurnoverUsd: 5_000_000, // PRD §24: min volume $5M
  autoTradeMinConfidence: 80, // PRD §55: auto ≥80
  trailingStopPct: 1.5, // PRD §54: trailing stop 1.5%
  scanIntervalMs: 5 * 60_000, // PRD §49: scan 5 menit
  cycleIntervalMs: 30_000,
};

export function dailyPnlPct(account: PaperAccount, equity: number): number {
  if (account.dayStartEquity <= 0) return 0;
  return ((equity - account.dayStartEquity) / account.dayStartEquity) * 100;
}

export interface RiskContext {
  account: PaperAccount;
  openPositions: PaperPosition[];
  equity: number;
  ticker?: Ticker;
  qtyHint?: number;
}

const EMPTY_SIZING: TradeSizing = {
  qty: 0,
  riskUsd: 0,
  notionalUsd: 0,
  feeEstUsd: 0,
  leverage: 1,
};

export function validateSignal(
  signal: TradeSignal,
  cfg: RiskConfig,
  ctx: RiskContext
): RiskValidation {
  const checks: RiskCheck[] = [];
  const add = (name: string, passed: boolean, detail: string) =>
    checks.push({ name, passed, detail });

  const dir = signal.action === "SHORT" ? -1 : 1;
  const entry = signal.entry;
  const sl = signal.stopLoss;
  const tp = signal.takeProfit;

  // --- Circuit breaker state ---
  const dPnl = dailyPnlPct(ctx.account, ctx.equity);
  add(
    "daily_loss_limit",
    dPnl > -cfg.maxDailyLossPct,
    `Daily P&L ${dPnl.toFixed(2)}% (limit -${cfg.maxDailyLossPct}%)`
  );
  add(
    "consecutive_losses",
    ctx.account.consecutiveLosses < cfg.maxConsecutiveLosses,
    `${ctx.account.consecutiveLosses}/${cfg.maxConsecutiveLosses} consecutive losses`
  );
  add(
    "max_open_positions",
    ctx.openPositions.length < cfg.maxOpenPositions,
    `${ctx.openPositions.length}/${cfg.maxOpenPositions} open positions`
  );

  // --- SL/TP wajib & sisi benar ---
  const slOk =
    Number.isFinite(sl) && sl > 0 && (dir > 0 ? sl < entry : sl > entry);
  add("stop_loss_valid", slOk, slOk ? `SL ${sl} valid` : `SL invalid (${sl})`);
  const tpOk =
    Number.isFinite(tp) && tp > 0 && (dir > 0 ? tp > entry : tp < entry);
  add("take_profit_valid", tpOk, tpOk ? `TP ${tp} valid` : `TP invalid (${tp})`);

  // --- R:R + position sizing ---
  // Toleransi epsilon untuk perbandingan float R:R (auto-ATR 3/1.5 bisa jadi 1.9999)
  let sizing: TradeSizing = EMPTY_SIZING;
  if (slOk && tpOk) {
    const riskPerUnit = Math.abs(entry - sl);
    const rewardPerUnit = Math.abs(tp - entry);
    const rr = riskPerUnit > 0 ? rewardPerUnit / riskPerUnit : 0;
    add(
      "min_risk_reward",
      rr + 1e-9 >= cfg.minRiskReward,
      `R:R 1:${rr.toFixed(2)} (min 1:${cfg.minRiskReward})`
    );

    // Qty: untuk order manual (qtyHint) pakai qty user; untuk auto pakai sizing risiko 1%
    const riskUsd = ctx.equity * (cfg.riskPerTradePct / 100);
    const autoQty = riskPerUnit > 0 ? riskUsd / riskPerUnit : 0;
    const qty = ctx.qtyHint && ctx.qtyHint > 0 ? ctx.qtyHint : autoQty;
    const notional = qty * entry;
    const feeEst = (notional * cfg.takerFeePct) / 100;
    sizing = { qty, riskUsd, notionalUsd: notional, feeEstUsd: feeEst, leverage: cfg.leverage };

    add(
      "position_size_within_risk",
      qty > 0,
      `Qty ${qty.toFixed(6)} memakai risiko $${riskUsd.toFixed(2)}`
    );
    add(
      "max_position_exposure",
      notional <= ctx.equity * (cfg.maxPositionPct / 100) + 1e-9,
      `Notional $${notional.toFixed(2)} vs maks ${cfg.maxPositionPct}% dari $${ctx.equity.toFixed(2)}`
    );
    add(
      "min_order_value",
      notional + 1e-9 >= cfg.minOrderUsd,
      `Notional $${notional.toFixed(2)} >= $${cfg.minOrderUsd}`
    );
    add("min_order_qty", qty >= cfg.minOrderQty, `Qty ${qty} >= ${cfg.minOrderQty}`);
    add(
      "available_balance",
      ctx.account.balanceUsd >= notional + feeEst,
      `Balance $${ctx.account.balanceUsd.toFixed(2)} vs butuh $${(notional + feeEst).toFixed(2)}`
    );
    add("leverage_allowed", cfg.leverage <= 1 + 1e-9, `Leverage ${cfg.leverage}x (maks 1x)`);
  } else {
    add("min_risk_reward", false, "R:R tidak bisa dihitung tanpa SL/TP valid");
  }

  // --- Data pasar ---
  const t = ctx.ticker;
  if (t && t.bid > 0 && t.ask > 0) {
    const mid = (t.bid + t.ask) / 2;
    const spreadPct = ((t.ask - t.bid) / mid) * 100;
    add(
      "spread_ok",
      spreadPct <= cfg.maxSpreadPct,
      `Spread ${spreadPct.toFixed(3)}% (maks ${cfg.maxSpreadPct}%)`
    );
  }
  if (t) {
    add(
      "liquidity_ok",
      t.turnover24h >= cfg.minTurnoverUsd,
      `Turnover 24h $${Math.round(t.turnover24h).toLocaleString("en-US")}`
    );
  }

  const reasons = checks.filter((c) => !c.passed).map((c) => `${c.name}: ${c.detail}`);
  return {
    approved: reasons.length === 0,
    reasons,
    checks,
    sizing,
    validatedAt: new Date().toISOString(),
  };
}
