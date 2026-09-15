// ============================================================
// SOFIA Trade — Performance calculator (PRD §36)
// Murni fungsi deterministik dari jurnal trade yang closed.
// ============================================================

import type { JournalEntry, PerformanceSummary } from "./types";

export function buildPerformance(journal: JournalEntry[]): PerformanceSummary {
  const closed = journal
    .filter((j) => j.result !== "OPEN" && j.pnl !== null)
    .sort((a, b) => new Date(a.closedAt || a.createdAt).getTime() - new Date(b.closedAt || b.createdAt).getTime());

  const wins = closed.filter((j) => (j.pnl || 0) > 0);
  const losses = closed.filter((j) => (j.pnl || 0) <= 0);
  const grossProfit = wins.reduce((s, j) => s + (j.pnl || 0), 0);
  const grossLoss = Math.abs(losses.reduce((s, j) => s + (j.pnl || 0), 0));
  const totalPnl = closed.reduce((s, j) => s + (j.pnl || 0), 0);

  let peak = 0;
  let maxDrawdownPct = 0;
  let cumulative = 0;
  const equityCurve: Array<{ t: string; cumulative: number }> = [];
  const perSymbol = new Map<string, { trades: number; pnl: number; wins: number }>();

  for (const j of closed) {
    cumulative += j.pnl || 0;
    if (cumulative > peak) peak = cumulative;
    const base = Math.abs(peak) > 1e-9 ? Math.abs(peak) : 1;
    const dd = ((peak - cumulative) / base) * 100;
    if (dd > maxDrawdownPct) maxDrawdownPct = dd;
    equityCurve.push({ t: j.closedAt || j.createdAt, cumulative: Math.round(cumulative * 100) / 100 });

    const s = perSymbol.get(j.symbol) || { trades: 0, pnl: 0, wins: 0 };
    s.trades += 1;
    s.pnl += j.pnl || 0;
    if ((j.pnl || 0) > 0) s.wins += 1;
    perSymbol.set(j.symbol, s);
  }

  const tradeCount = closed.length;
  const bySymbol: PerformanceSummary["bySymbol"] = [];
  perSymbol.forEach((st, symbol) => {
    bySymbol.push({
      symbol,
      trades: st.trades,
      pnl: Math.round(st.pnl * 100) / 100,
      winRatePct: st.trades ? Math.round((st.wins / st.trades) * 1000) / 10 : 0,
    });
  });

  return {
    tradeCount,
    wins: wins.length,
    losses: losses.length,
    winRatePct: tradeCount ? Math.round((wins.length / tradeCount) * 1000) / 10 : 0,
    grossProfitUsd: Math.round(grossProfit * 100) / 100,
    grossLossUsd: Math.round(grossLoss * 100) / 100,
    profitFactor: grossLoss > 1e-9 ? Math.round((grossProfit / grossLoss) * 100) / 100 : null,
    expectancyUsd: tradeCount ? Math.round((totalPnl / tradeCount) * 100) / 100 : 0,
    avgWinUsd: wins.length ? Math.round((grossProfit / wins.length) * 100) / 100 : 0,
    avgLossUsd: losses.length ? Math.round((grossLoss / losses.length) * 100) / 100 : 0,
    totalPnlUsd: Math.round(totalPnl * 100) / 100,
    maxDrawdownPct: Math.round(maxDrawdownPct * 100) / 100,
    bestTradeUsd: closed.length ? Math.round(Math.max(...closed.map((j) => j.pnl || 0)) * 100) / 100 : 0,
    worstTradeUsd: closed.length ? Math.round(Math.min(...closed.map((j) => j.pnl || 0)) * 100) / 100 : 0,
    bySymbol,
    equityCurve,
  };
}
