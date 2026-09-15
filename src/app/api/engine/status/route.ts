import { getStore } from "@/lib/core/store";
import { equityOf } from "@/lib/core/paper-engine";
import { getUsdIdrSync } from "@/lib/core/currency";
import { ok } from "@/lib/core/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = getStore();
  const equity = equityOf(s);
  const open = s.positions.filter((p) => p.status === "OPEN");
  const unrealized = open.reduce((sum, p) => sum + p.unrealizedPnl, 0);
  const openNotional = open.reduce((sum, p) => sum + p.currentPrice * p.qty, 0);
  return ok({
    health: {
      state: s.engineState,
      mode: s.mode,
      halted: s.halted,
      haltedReason: s.haltedReason,
      startedAt: s.startedAt,
      cycles: s.stats.cycles,
      errors: s.stats.errors,
      marketSource: s.marketSource,
      lastTickersAt: s.lastTickersAt,
      lastScanAt: s.lastScanAt,
      liveUnlocked: s.liveUnlocked,
    },
    account: { ...s.account, equity, unrealizedPnl: unrealized, openNotional },
    positions: open,
    orders: s.orders.slice(0, 50),
    candidates: s.candidates,
    signals: s.signals.slice(0, 20),
    events: s.events.slice(0, 100),
    agents: s.agents,
    riskConfig: s.riskConfig,
    currency: getUsdIdrSync(),
  });
}
