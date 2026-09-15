import { getStore } from "@/lib/core/store";
import { equityOf, refreshDailyPnl } from "@/lib/core/paper-engine";
import { getUsdIdrSync } from "@/lib/core/currency";
import { ok } from "@/lib/core/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = getStore();
  refreshDailyPnl(s);
  const equity = equityOf(s);
  const open = s.positions.filter((p) => p.status === "OPEN");
  const unrealized = open.reduce((sum, p) => sum + p.unrealizedPnl, 0);
  const rate = getUsdIdrSync().usdIdr;
  const assets = open.map((p) => ({
    symbol: p.symbol,
    qty: p.qty,
    entryPrice: p.entryPrice,
    currentPrice: p.currentPrice,
    valueUsd: p.currentPrice * p.qty,
    unrealizedPnl: p.unrealizedPnl,
  }));
  return ok({
    equityUsd: equity,
    balanceUsd: s.account.balanceUsd,
    unrealizedPnlUsd: unrealized,
    realizedPnlUsd: s.account.realizedPnl,
    dailyPnlUsd: s.account.dailyPnl,
    feesPaidUsd: s.account.feesPaid,
    startingBalanceUsd: s.account.startingBalanceUsd,
    usdIdr: rate,
    equityIdr: Math.round(equity * rate),
    balanceIdr: Math.round(s.account.balanceUsd * rate),
    assets,
  });
}
