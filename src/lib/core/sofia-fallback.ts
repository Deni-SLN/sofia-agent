// Fallback deterministik Manager + builder konteks engine live.
import { getStore } from "./store";
import { equityOf, openPositions } from "./paper-engine";
import { buildPerformance } from "./performance";
export function fmt(n: number): string {
  if (!Number.isFinite(n)) return "--";
  const s = n < 0 ? "-" : "";
  return `${s}$${Math.abs(n).toFixed(2)}`;
}
export function buildContext(): string {
  const s = getStore();
  const eq = equityOf(s);
  const open = openPositions(s);
  const unreal = open.reduce((a, p) => a + p.unrealizedPnl, 0);
  const perf = buildPerformance(s.journal);
  const last = s.signals[0];
  return [
    `ENGINE: ${s.engineState} ${s.mode} halted=${s.halted} cycles=${s.stats.cycles} market=${s.marketSource}`,
    `ACCOUNT: equity=${fmt(eq)} balance=${fmt(s.account.balanceUsd)} unreal=${fmt(unreal)} realized=${fmt(s.account.realizedPnl)} daily=${fmt(s.account.dailyPnl)}`,
    `RISK: risk=${s.riskConfig.riskPerTradePct}% dailyLimit=${s.riskConfig.maxDailyLossPct}% consec=${s.account.consecutiveLosses}/${s.riskConfig.maxConsecutiveLosses} minRR=1:${s.riskConfig.minRiskReward}`,
    `OPEN(${open.length}): ${open.length ? open.map((p) => `${p.symbol} qty=${p.qty} entry=${fmt(p.entryPrice)} now=${fmt(p.currentPrice)} upl=${fmt(p.unrealizedPnl)}`).join(" | ") : "none"}`,
    `PERF: closed=${perf.tradeCount} W=${perf.wins} L=${perf.losses} WR=${perf.winRatePct}% total=${fmt(perf.totalPnlUsd)} PF=${perf.profitFactor ?? "-"}`,
    `SIGNAL: ${last ? `${last.symbol} ${last.action} conf=${last.confidence} ${last.strategy} entry=${fmt(last.entry)} SL=${fmt(last.stopLoss)} TP=${fmt(last.takeProfit)}` : "none"}`,
  ].join("\n");
}
export function deterministic(q: string): string {
  const s = getStore();
  const eq = equityOf(s);
  const open = openPositions(s);
  const unreal = open.reduce((a, p) => a + p.unrealizedPnl, 0);
  const perf = buildPerformance(s.journal);
  const last = s.signals[0];
  const has = (...w: string[]) => w.some((x) => q.includes(x));
  if (has("portfolio", "saldo", "equity")) return `Equity ${fmt(eq)} (balance ${fmt(s.account.balanceUsd)}, unreal ${fmt(unreal)}). Posisi ${open.length}/${s.riskConfig.maxOpenPositions}.`;
  if (has("posisi", "position")) return open.length ? open.map((p) => `- ${p.symbol} ${p.qty} @ ${fmt(p.entryPrice)} upl ${fmt(p.unrealizedPnl)}`).join("\n") : "Tidak ada posisi terbuka.";
  if (has("risiko", "risk", "aman")) return `Risiko ${s.riskConfig.riskPerTradePct}%, daily ${fmt(s.account.dailyPnl)}, status ${s.engineState}.`;
  if (has("performa", "win", "pnl")) return perf.tradeCount ? `${perf.tradeCount} closed WR ${perf.winRatePct}% total ${fmt(perf.totalPnlUsd)}` : "Belum ada trade closed.";
  if (has("sinyal", "signal")) return last ? `${last.symbol} ${last.action} conf ${last.confidence} entry ${fmt(last.entry)}` : "Belum ada sinyal.";
  if (has("help", "cara", "start")) return "1. Command Center > START (PAPER). 2. Trading > order manual. 3. Risk selalu validasi.";
  return `SOFIA ${s.engineState}: equity ${fmt(eq)}, ${open.length} posisi, ${perf.tradeCount} closed. Ketik 'help'.`;
}
