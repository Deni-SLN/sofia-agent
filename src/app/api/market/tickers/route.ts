import { getTickers } from "@/lib/core/market-data";
import { ok } from "@/lib/core/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = parseInt(url.searchParams.get("limit") || "50", 10) || 50;
  const limit = Math.min(Math.max(raw, 1), 200);
  const snap = await getTickers();
  const sorted = [...snap.tickers].sort((a, b) => b.turnover24h - a.turnover24h);
  return ok(sorted.slice(0, limit), {
    source: snap.source,
    fetchedAt: snap.fetchedAt,
    latencyMs: snap.latencyMs,
    total: snap.tickers.length,
  });
}
