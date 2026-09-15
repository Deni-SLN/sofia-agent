// ============================================================
// SOFIA Trade — Deterministic backtest (PRD Fase lanjutan)
// Menjalankan strategi trend-following sederhana di atas data
// kline historis Bybit. Murni fungsi deterministik: fee 0.1%,
// slippage 0.05%, SL = 1.5x ATR, TP = 3x ATR (R:R 1:2),
// max 1 posisi, leverage 1x — sama seperti paper-engine V1.
// ============================================================

import type { Candle, RiskConfig } from "./types";
import { atr, ema, rsi } from "./indicators";
import { getBuiltin, normalizeParams } from "./strategies";

export interface BacktestStrategyInput {
  type: string;
  params?: Record<string, number>;
}

export interface BacktestTrade {
  idx: number;
  time: string;
  symbol: string;
  side: "LONG";
  entry: number;
  exit: number;
  stopLoss: number;
  takeProfit: number;
  qty: number;
  pnl: number;
  exitReason: "TP_HIT" | "SL_HIT" | "SIGNAL_EXIT" | "END_OF_DATA";
}

export interface BacktestResult {
  symbol: string;
  interval: string;
  strategy: string;
  candles: number;
  startingBalanceUsd: number;
  endingBalanceUsd: number;
  totalPnlUsd: number;
  returnPct: number;
  trades: BacktestTrade[];
  wins: number;
  losses: number;
  winRatePct: number;
  maxDrawdownPct: number;
  profitFactor: number | null;
}

export function runBacktest(
  symbol: string,
  interval: string,
  candles: Candle[],
  cfg: RiskConfig,
  startingBalanceUsd: number,
  strategy?: BacktestStrategyInput
): BacktestResult {
  // Strategi builtin opsional; tanpa itu pakai aturan trend default.
  const builtin = strategy ? getBuiltin(strategy.type) : null;
  if (strategy && !builtin) throw new Error(`Strategi tidak dikenal: ${strategy.type}`);
  const prepared = builtin ? builtin.prepare(candles, normalizeParams(builtin, strategy?.params)) : null;
  const strategyName = builtin ? builtin.name : "TREND_DEFAULT";

  const trades: BacktestTrade[] = [];
  let balance = startingBalanceUsd;
  let peak = startingBalanceUsd;
  let maxDd = 0;

  if (candles.length < 60 || startingBalanceUsd <= 0) {
    return {
      symbol, interval, strategy: strategyName, candles: candles.length,
      startingBalanceUsd, endingBalanceUsd: balance,
      totalPnlUsd: 0, returnPct: 0, trades,
      wins: 0, losses: 0, winRatePct: 0, maxDrawdownPct: 0, profitFactor: null,
    };
  }

  const closes = candles.map((c) => c.close);
  const e20 = ema(closes, 20);
  const e50 = ema(closes, 50);
  const r = rsi(closes, 14);
  const a = atr(candles, 14);

  interface Open { entry: number; sl: number; tp: number; qty: number; idx: number; feeEntry: number }
  let open: Open | null = null;

  const closeOpen = (exitPx: number, idx: number, reason: BacktestTrade["exitReason"]) => {
    if (!open) return;
    const exitFee = (open.qty * exitPx * cfg.takerFeePct) / 100;
    const realized = (exitPx - open.entry) * open.qty - exitFee;
    balance += open.qty * exitPx - exitFee;
    trades.push({
      idx, time: new Date(candles[idx].time).toISOString(), symbol,
      side: "LONG", entry: open.entry, exit: exitPx,
      stopLoss: open.sl, takeProfit: open.tp, qty: open.qty,
      pnl: Math.round(realized * 100) / 100, exitReason: reason,
    });
    if (balance > peak) peak = balance;
    const dd = ((peak - balance) / Math.max(peak, 1e-9)) * 100;
    if (dd > maxDd) maxDd = dd;
    open = null;
  };

  const loopStart = prepared ? Math.max(50, prepared.startIdx) : 50;
  for (let i = loopStart; i < candles.length; i++) {
    const px = closes[i];
    const curE20 = e20[i];
    const curE50 = e50[i];
    const curRsi = r[i];
    const curAtr = a[i];
    if (![px, curE20, curE50, curRsi, curAtr].every((v) => Number.isFinite(v)) || curAtr <= 0) continue;

    // Monitor posisi terbuka: cek TP/SL intrabar via high/low
    if (open) {
      const bar = candles[i];
      if (bar.low <= open.sl) closeOpen(open.sl, i, "SL_HIT");
      else if (bar.high >= open.tp) closeOpen(open.tp, i, "TP_HIT");
      else if (prepared ? prepared.exit[i] : px < curE20 && curRsi < 45) closeOpen(px, i, "SIGNAL_EXIT");
      continue;
    }

    // Entry: sinyal strategi builtin, atau aturan trend default
    const entrySignal = prepared ? prepared.enter[i] : curE20 > curE50 && px > curE20 && curRsi >= 50 && curRsi <= 70;
    if (entrySignal) {
      const slDist = curAtr * 1.5;
      const sl = px - slDist;
      const tp = px + slDist * 2;
      if (!(sl > 0 && tp > px)) continue;
      const riskUsd = balance * (cfg.riskPerTradePct / 100);
      const qty = slDist > 0 ? riskUsd / slDist : 0;
      if (!(qty > 0)) continue;
      const fill = px * (1 + cfg.slippagePct / 100);
      const notional = qty * fill;
      const feeEntry = (notional * cfg.takerFeePct) / 100;
      if (notional > balance * (cfg.maxPositionPct / 100)) continue;
      if (notional < cfg.minOrderUsd) continue;
      if (balance < notional + feeEntry) continue;
      balance -= notional + feeEntry;
      open = { entry: fill, sl, tp, qty, idx: i, feeEntry };
    }
  }

  if (open) closeOpen(closes[closes.length - 1], candles.length - 1, "END_OF_DATA");

  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl <= 0);
  const gp = wins.reduce((s, t) => s + t.pnl, 0);
  const gl = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const total = trades.reduce((s, t) => s + t.pnl, 0);

  return {
    symbol, interval, strategy: strategyName, candles: candles.length,
    startingBalanceUsd: Math.round(startingBalanceUsd * 100) / 100,
    endingBalanceUsd: Math.round(balance * 100) / 100,
    totalPnlUsd: Math.round(total * 100) / 100,
    returnPct: startingBalanceUsd > 0 ? Math.round((total / startingBalanceUsd) * 10000) / 100 : 0,
    trades: trades.slice(-200),
    wins: wins.length, losses: losses.length,
    winRatePct: trades.length ? Math.round((wins.length / trades.length) * 1000) / 10 : 0,
    maxDrawdownPct: Math.round(maxDd * 100) / 100,
    profitFactor: gl > 1e-9 ? Math.round((gp / gl) * 100) / 100 : null,
  };
}
