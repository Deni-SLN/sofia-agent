// ============================================================
// SOFIA Trade — Decision Agent (PRD §12.8, §53, §55)
// Scoring 8 faktor 0-100 dengan bobot persen:
// teknikal 20, momentum 15, orderFlow 15, regime 10, news 10,
// strategyFit 10, riskReward 10, likuiditas 10.
// LONG jika skor >= 80, WAIT jika 60-79, else NO_TRADE.
// Catatan: reasoning LLMs hanya dipakai untuk narasi; angka
// SL/TP/score selalu dari fungsi deterministik ini.
// ============================================================

import type { Candle, MarketRegime, ScoreBreakdown, Ticker, TradeSignal } from "./types";
import { atr, bollinger, clamp, ema, highest, lastFinite, macd, roc, rsi, sma } from "./indicators";

export function analyze(input: {
  symbol: string;
  candles: Candle[];
  ticker: Ticker;
  mode?: "PAPER" | "LIVE";
}): TradeSignal {
  const { symbol, candles, ticker } = input;
  const mode = input.mode ?? "PAPER";
  const nowIso = new Date().toISOString();
  const id = `${symbol}-${Date.now()}`;
  const neutral: ScoreBreakdown = {
    technical: 0, momentum: 0, orderFlow: 0, regime: 0,
    news: 50, strategyFit: 0, riskReward: 0, liquidity: 0,
  };
  const lastClose = candles.length ? candles[candles.length - 1].close : 0;
  const price =
    Number.isFinite(ticker.lastPrice) && ticker.lastPrice > 0 ? ticker.lastPrice : lastClose;

  if (candles.length < 60 || !Number.isFinite(price) || price <= 0) {
    return {
      id, symbol, action: "NO_TRADE", confidence: 0, entry: price || 0,
      stopLoss: 0, takeProfit: 0, riskReward: 0, strategy: "INSUFFICIENT_DATA",
      marketRegime: "SIDEWAYS", invalidation: "Data candle tidak cukup",
      scores: neutral, reasons: ["Data candle < 60, analisis dibatalkan"],
      state: "SIGNAL_CREATED", mode, createdAt: nowIso,
    };
  }

  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const vols = candles.map((c) => c.volume);

  const e20 = lastFinite(ema(closes, 20));
  const e50 = lastFinite(ema(closes, 50));
  const r = lastFinite(rsi(closes, 14));
  const m = macd(closes);
  const hist = lastFinite(m.hist);
  const a = lastFinite(atr(candles, 14));
  const r10 = lastFinite(roc(closes, 10));
  const avgVol = lastFinite(sma(vols, 20));
  const relVol = avgVol > 0 ? lastFinite(vols) / avgVol : 1;
  const prevHigh = highest(highs, 20, highs.length - 2);
  void bollinger(closes);

  const reasons: string[] = [];

  if (!Number.isFinite(a) || a <= 0) {
    return {
      id, symbol, action: "NO_TRADE", confidence: 0, entry: price,
      stopLoss: 0, takeProfit: 0, riskReward: 0, strategy: "NO_VOLATILITY",
      marketRegime: "SIDEWAYS", invalidation: "ATR tidak valid",
      scores: neutral, reasons: ["ATR tidak valid, analisis dibatalkan"],
      state: "SIGNAL_CREATED", mode, createdAt: nowIso,
    };
  }

  const atrPct = (a / price) * 100;

  // --- 1. Technical (EMA structure + RSI + MACD) ---
  let technical = 50;
  if (e20 > e50) { technical += 20; reasons.push("EMA20 di atas EMA50 (struktur uptrend)"); }
  else { technical -= 20; reasons.push("EMA20 di bawah EMA50 (struktur downtrend)"); }
  if (price > e20) { technical += 10; reasons.push("Harga di atas EMA20"); }
  else { technical -= 10; reasons.push("Harga di bawah EMA20"); }
  if (r >= 70) { technical -= 10; reasons.push(`RSI ${r.toFixed(0)} overbought`); }
  else if (r >= 50) { technical += 10; reasons.push(`RSI ${r.toFixed(0)} zona bullish`); }
  else if (r < 40) { technical -= 5; reasons.push(`RSI ${r.toFixed(0)} lemah`); }
  if (hist > 0) { technical += 10; reasons.push("Histogram MACD positif"); }
  else { technical -= 10; reasons.push("Histogram MACD negatif"); }
  technical = clamp(technical);

  // --- 2. Momentum (ROC + relative volume) ---
  let momentum = 50;
  if (r10 > 2) { momentum += 25; reasons.push(`ROC10 +${r10.toFixed(2)}% kuat`); }
  else if (r10 > 0) momentum += 15;
  else if (r10 > -2) momentum -= 10;
  else { momentum -= 25; reasons.push(`ROC10 ${r10.toFixed(2)}% lemah`); }
  if (relVol > 1.5) { momentum += 20; reasons.push(`Volume relatif ${relVol.toFixed(2)}x`); }
  else if (relVol > 1) momentum += 10;
  else momentum -= 5;
  momentum = clamp(momentum);

  // --- 3. Order flow proxy (anatomi candle terakhir) ---
  const lastC = candles[candles.length - 1];
  const range = lastC.high - lastC.low;
  const closePos = range > 0 ? (lastC.close - lastC.low) / range : 0.5;
  let orderFlow = 50 + (closePos - 0.5) * 40;
  if (lastC.close > lastC.open && relVol > 1.2) {
    orderFlow += 15;
    reasons.push("Agresi beli di volume di atas rata-rata");
  }
  if (lastC.close < lastC.open && relVol > 1.2) {
    orderFlow -= 15;
    reasons.push("Agresi jual di volume di atas rata-rata");
  }
  orderFlow = clamp(orderFlow);

  // --- 4. Regime ---
  const slope50 = e50 - closes[Math.max(0, closes.length - 21)];
  let regime: MarketRegime = "SIDEWAYS";
  if (ticker.price24hPct < -8 && relVol > 2) regime = "PANIC";
  else if (ticker.price24hPct > 8 && relVol > 2) regime = "EUPHORIA";
  else if (atrPct > 3) regime = "HIGH_VOLATILITY";
  else if (slope50 > 0 && price > e50) regime = "BULL_TREND";
  else if (slope50 < 0 && price < e50) regime = "BEAR_TREND";
  else if (atrPct < 0.5) regime = "LOW_VOLATILITY";
  reasons.push(`Regime pasar: ${regime}`);

  // --- 5. Strategy fit ---
  let strategy = "TREND_FOLLOWING";
  let strategyFit = 50;
  const pullback = e20 > e50 && r >= 40 && r <= 62 && price <= e20 * 1.01;
  const breakout = price >= prevHigh && relVol > 1.3;
  if (breakout) {
    strategy = "BREAKOUT";
    strategyFit = 78;
    reasons.push(`Breakout di atas high 20-bar ${prevHigh.toFixed(4)}`);
  } else if (pullback) {
    strategy = "PULLBACK";
    strategyFit = 75;
    reasons.push("Pullback ke EMA20 dalam uptrend");
  } else if (regime === "BULL_TREND") {
    strategy = "TREND_FOLLOWING";
    strategyFit = 70;
  } else if (regime === "SIDEWAYS") {
    strategy = "RANGE_TRADING";
    strategyFit = 55;
  }

  // --- 6. SL/TP dari ATR (min R:R 1:2 per PRD §53) ---
  const slDist = a * 1.5;
  const stopLoss = price - slDist;
  const takeProfit = price + slDist * 2;
  const riskReward = 2;

  // --- 7. Likuiditas ---
  const turnover = ticker.turnover24h;
  const liquidity =
    turnover >= 50_000_000 ? 95
    : turnover >= 20_000_000 ? 85
    : turnover >= 10_000_000 ? 70
    : turnover >= 5_000_000 ? 55
    : 30;

  const news = 50; // netral hingga News Agent/API terhubung (PRD §32)
  const rrScore = riskReward >= 3 ? 95 : riskReward >= 2 ? 80 : riskReward >= 1.5 ? 60 : 40;

  const regimeScore =
    regime === "BULL_TREND" ? 85
    : regime === "BEAR_TREND" ? 20
    : regime === "HIGH_VOLATILITY" ? 50
    : regime === "PANIC" ? 10
    : regime === "EUPHORIA" ? 55
    : regime === "LOW_VOLATILITY" ? 45
    : 50;

  const scores: ScoreBreakdown = {
    technical, momentum, orderFlow,
    regime: regimeScore, news, strategyFit, riskReward: rrScore, liquidity,
  };
  const confidence = Math.round(
    technical * 0.2 + momentum * 0.15 + orderFlow * 0.15 + regimeScore * 0.1 +
    news * 0.1 + strategyFit * 0.1 + rrScore * 0.1 + liquidity * 0.1
  );

  // V1: strategi long-only untuk paper default
  const action = confidence >= 80 ? "LONG" : confidence >= 60 ? "WAIT" : "NO_TRADE";

  return {
    id, symbol, action, confidence, entry: price, stopLoss, takeProfit, riskReward,
    strategy, marketRegime: regime,
    invalidation: `Batal jika close di bawah ${stopLoss.toFixed(4)}`,
    scores, reasons, state: "SIGNAL_CREATED", mode, createdAt: nowIso,
  };
}

