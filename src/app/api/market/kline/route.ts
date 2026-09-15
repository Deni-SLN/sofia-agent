import { getKline } from "@/lib/core/market-data";
import { ok, apiError } from "@/lib/core/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const symbol = (url.searchParams.get("symbol") || "").toUpperCase();
  if (!symbol) return apiError("parameter symbol wajib", 400);
  const interval = url.searchParams.get("interval") || "15";
  const raw = parseInt(url.searchParams.get("limit") || "200", 10) || 200;
  const limit = Math.min(Math.max(raw, 10), 1000);
  const candles = await getKline(symbol, interval, limit);
  return ok(candles, { symbol, interval, count: candles.length });
}
