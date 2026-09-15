import { getStore } from "@/lib/core/store";
import { getUsdIdrSync } from "@/lib/core/currency";
import { ok } from "@/lib/core/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = getStore();
  const uptimeMs = s.startedAt ? Date.now() - new Date(s.startedAt).getTime() : 0;
  return ok({
    engine: {
      state: s.engineState,
      mode: s.mode,
      halted: s.halted,
      haltedReason: s.haltedReason,
      uptimeMs,
      cycles: s.stats.cycles,
      errors: s.stats.errors,
      startedAt: s.startedAt,
    },
    market: { source: s.marketSource, lastTickersAt: s.lastTickersAt },
    currency: getUsdIdrSync(),
    liveUnlocked: s.liveUnlocked,
  });
}
