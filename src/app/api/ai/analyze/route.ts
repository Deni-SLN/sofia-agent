// AI Analysis API (PRD 7.5 + 7.12): POST {symbol, timeframe, promptId?}
// Ringkasan teknikal deterministik dari engine + narasi LLM (grounded).
// promptId -> pakai template dari Prompt Library sebagai system prompt.
import { ok, apiError, readJson } from "@/lib/core/api";
import { getKline } from "@/lib/core/market-data";
import { analyze } from "@/lib/core/decision";
import { aiChat } from "@/lib/core/ai-router";
import { renderPrompt } from "@/lib/core/prompts";
import { getStore } from "@/lib/core/store";
export const dynamic = "force-dynamic";
const SYS = "Kamu analis crypto Indonesia. Jelaskan sinyal teknikal berikut ringkas (<=150 kata), sebut level entry/SL/TP persis dari DATA, akhiri dengan risiko. Jangan buat angka baru.";
export async function POST(req: Request) {
  const b = await readJson<{ symbol?: string; timeframe?: string; promptId?: string }>(req);
  const symbol = String(b.symbol || "BTCUSDT").toUpperCase().slice(0, 20);
  const tf = String(b.timeframe || "60").slice(0, 5);
  const interval = tf === "D" ? "D" : ["15", "30", "60", "240"].includes(tf) ? tf : "60";
  let system = SYS;
  if (b.promptId) {
    const p = getStore().prompts.find((x) => x.id === b.promptId);
    if (p) system = renderPrompt(p.template, { symbol, timeframe: interval });
  }
  try {
    const candles = await getKline(symbol, interval, 200);
    const lastClose = candles.length ? candles[candles.length - 1].close : 0;
    const ticker = { symbol, lastPrice: lastClose, price24hPct: 0, volume24h: 0, turnover24h: 0, bid: lastClose, ask: lastClose, source: "BYBIT" as const };
    const sig = analyze({ symbol, candles, ticker, mode: "PAPER" });
    const data = `DATA: ${sig.symbol} ${sig.action} conf=${sig.confidence} entry=${sig.entry} SL=${sig.stopLoss} TP=${sig.takeProfit} RR=1:${sig.riskReward} strategy=${sig.strategy} regime=${sig.marketRegime} scores=${JSON.stringify(sig.scores)} reasons=${sig.reasons.slice(0, 5).join("; ")}`;
    let narrative: string | null = null;
    let meta: Record<string, unknown> = { llm: false };
    try {
      const r = await aiChat("analysis", system, data);
      narrative = r.reply;
      meta = { llm: true, provider: r.providerId, model: r.model, costUsd: r.costUsd, cached: r.cached };
    } catch (e) {
      meta = { llm: false, reason: e instanceof Error ? e.message.slice(0, 150) : String(e) };
    }
    return ok({ signal: sig, narrative }, meta);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : String(e), 500);
  }
}
