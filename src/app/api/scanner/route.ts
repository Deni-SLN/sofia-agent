import { getStore } from "@/lib/core/store";
import { getTickers } from "@/lib/core/market-data";
import { scanMarkets } from "@/lib/core/scanner";
import { ok } from "@/lib/core/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const s = getStore();
  const url = new URL(req.url);
  const refresh = url.searchParams.get("refresh") === "1";
  if (refresh || s.candidates.length === 0) {
    const snap = await getTickers();
    s.marketSource = snap.source;
    s.lastTickersAt = snap.fetchedAt;
    s.candidates = scanMarkets(snap.tickers, s.riskConfig);
    s.lastScanAt = new Date().toISOString();
  }
  return ok(s.candidates, { lastScanAt: s.lastScanAt, source: s.marketSource });
}
