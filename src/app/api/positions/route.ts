import { getStore, pushEvent, closeJournalTrade, pushNotification } from "@/lib/core/store";
import { ok, apiError, readJson } from "@/lib/core/api";
import { getTickerFor } from "@/lib/core/market-data";
import * as paper from "@/lib/core/paper-engine";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = getStore();
  return ok(s.positions.slice(0, 100), {
    open: s.positions.filter((p) => p.status === "OPEN").length,
    closed: s.positions.filter((p) => p.status === "CLOSED").length,
  });
}

export async function POST(req: Request) {
  const s = getStore();
  const body = await readJson<{
    action?: string; id?: string; takeProfit?: number; stopLoss?: number; trailingStopPct?: number;
  }>(req);
  const action = String(body.action || "").toLowerCase();
  const id = String(body.id || "");
  if (!id) return apiError("parameter id wajib", 400);
  const p = s.positions.find((x) => x.id === id);
  if (!p) return apiError("Posisi tidak ditemukan", 404);

  if (action === "close") {
    if (p.status !== "OPEN") return apiError("Posisi sudah closed", 409);
    const ticker = await getTickerFor(p.symbol);
    const px = ticker ? ticker.lastPrice : p.currentPrice;
    const res = paper.closePosition(s, id, px, "MANUAL_CLOSE", s.riskConfig.takerFeePct);
    if (!res.ok) return apiError(res.error, 409);
    pushEvent("INFO", "TRADE", `${p.symbol} ditutup manual @${px} pnl $${res.realized.toFixed(2)}`);
    pushNotification("TRADE", res.realized >= 0 ? "INFO" : "WARN", `${p.symbol} ditutup (manual)`, `pnl ${res.realized >= 0 ? "+" : ""}$${res.realized.toFixed(2)} @${px}`);
    // Tutup entri jurnal OPEN agar performance (win rate, P&L) ikut terhitung
    const pnlPct = p.entryPrice > 0 ? (res.realized / (p.entryPrice * p.qty)) * 100 : 0;
    closeJournalTrade(p.id, {
      result: res.realized > 0 ? "WIN" : res.realized < 0 ? "LOSS" : "BREAKEVEN",
      pnl: Math.round(res.realized * 100) / 100,
      pnlPct: Math.round(pnlPct * 100) / 100,
      durationMs: p.openedAt ? Date.now() - new Date(p.openedAt).getTime() : null,
      closedAt: new Date().toISOString(),
    });
    return ok({ position: p, realized: res.realized });
  }

  if (action === "modify") {
    if (p.status !== "OPEN") return apiError("Posisi sudah closed", 409);
    if (body.takeProfit !== undefined) {
      const tp = Number(body.takeProfit);
      if (!(tp > 0) || tp <= p.entryPrice) return apiError("TP harus > entry (long)", 400);
      p.takeProfit = tp;
    }
    if (body.stopLoss !== undefined) {
      const stopLoss = Number(body.stopLoss);
      if (!(stopLoss > 0) || stopLoss >= p.entryPrice) return apiError("SL harus < entry (long)", 400);
      p.stopLoss = stopLoss;
    }
    if (body.trailingStopPct !== undefined) {
      const ts = Number(body.trailingStopPct);
      if (!(ts >= 0) || ts > 20) return apiError("trailingStopPct 0..20", 400);
      p.trailingStopPct = ts > 0 ? ts : null;
      if (ts === 0) p.trailingStopPrice = null;
    }
    pushEvent("INFO", "TRADE", `${p.symbol} TP/SL dimodifikasi`);
    return ok({ position: p });
  }

  return apiError("action harus close atau modify", 400);
}
