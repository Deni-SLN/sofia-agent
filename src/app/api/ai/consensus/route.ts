// Parallel Analysis API (PRD 7.4): POST {symbol, timeframe?, count?}
// Analisa paralel ke beberapa LLM + skor konsensus stance.
import { ok, apiError, readJson } from "@/lib/core/api";
import { getKline } from "@/lib/core/market-data";
import { analyze } from "@/lib/core/decision";
import { aiParallel } from "@/lib/core/ai-router";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const SYS = "Kamu analis crypto Indonesia. Beri pendapat ringkas (<=100 kata) tentang kondisi pasar dari DATA berikut: bullish/bearish/netral, level penting, dan risiko. Angka hanya dari DATA.";
export async function POST(req: Request) {
  const b = await readJson<{ symbol?: string; timeframe?: string; count?: number }>(req);
  const symbol = String(b.symbol || "BTCUSDT").toUpperCase().slice(0, 20);
  const tf = String(b.timeframe || "60").slice(0, 5);
  const interval = tf === "D" ? "D" : ["15", "30", "60", "240"].includes(tf) ? tf : "60";
  const count = Math.min(Math.max(Number(b.count) || 3, 2), 6);
  try {
    const candles = await getKline(symbol, interval, 200);
    const lastClose = candles.length ? candles[candles.length - 1].close : 0;
    const ticker = { symbol, lastPrice: lastClose, price24hPct: 0, volume24h: 0, turnover24h: 0, bid: lastClose, ask: lastClose, source: "BYBIT" as const };
    const sig = analyze({ symbol, candles, ticker, mode: "PAPER" });
    const user = `DATA: ${sig.symbol} ${sig.action} conf=${sig.confidence} entry=${sig.entry} SL=${sig.stopLoss} TP=${sig.takeProfit} regime=${sig.marketRegime}`;
    const result = await aiParallel("analysis", SYS, `${user}\n\nPertanyaan: bagaimana outlook ${symbol}?`, count);
    return ok(result, { signal: { symbol, action: sig.action, confidence: sig.confidence } });
  } catch (e) {
    return apiError(e instanceof Error ? e.message : String(e), 500);
  }
}