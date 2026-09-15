// ============================================================
// SOFIA Trade — Market Scanner (PRD §18, §49)
// Pipeline: scan ticker Bybit -> filter likuiditas/spread/panik ->
// skor -> top-N kandidat untuk analisis mendalam Decision Agent.
// Cepat & murah: hanya memakai data ticker, bukan kline.
// ============================================================

import type { MarketCandidate, RiskConfig, SignalAction, Ticker } from "./types";

export function scanMarkets(tickers: Ticker[], cfg: RiskConfig, topN = 10): MarketCandidate[] {
  const usdt = tickers.filter((t) => t.symbol.endsWith("USDT") && t.lastPrice > 0);
  const maxTurnover = Math.max(...usdt.map((t) => t.turnover24h), 1);

  const scored: MarketCandidate[] = [];
  for (const t of usdt) {
    // Filter likuiditas minimum (PRD §24)
    if (t.turnover24h < cfg.minTurnoverUsd) continue;
    // Filter spread
    if (t.bid > 0 && t.ask > 0) {
      const mid = (t.bid + t.ask) / 2;
      if (mid > 0 && ((t.ask - t.bid) / mid) * 100 > cfg.maxSpreadPct) continue;
    }
    // Filter panic dump > 25% (PRD §18: hindari panic selling)
    if (Math.abs(t.price24hPct) > 25) continue;

    const turnoverScore = (t.turnover24h / maxTurnover) * 60;
    const momentumMag = Math.min(Math.abs(t.price24hPct), 10);
    const momentumScore = momentumMag * 4; // 0..40
    const score = Math.round((turnoverScore + momentumScore) * 10) / 10;

    const signal: SignalAction =
      score >= 70 ? "LONG" : score >= 50 ? "WAIT" : "NO_TRADE";

    scored.push({
      symbol: t.symbol,
      score,
      signal,
      price24hPct: t.price24hPct,
      turnover24h: t.turnover24h,
      ticker: t,
    });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topN);
}
