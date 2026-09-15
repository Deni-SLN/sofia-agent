import { getStore, pushEvent, addJournal, pushNotification } from "@/lib/core/store";
import { ok, apiError, readJson } from "@/lib/core/api";
import { getTickerFor, getKline } from "@/lib/core/market-data";
import { validateSignal } from "@/lib/core/risk-engine";
import * as paper from "@/lib/core/paper-engine";
import { atr, lastFinite } from "@/lib/core/indicators";
import type { TradeSignal } from "@/lib/core/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const s = getStore();
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const orders = status ? s.orders.filter((o) => o.status === status) : s.orders;
  return ok(orders.slice(0, 100), { count: orders.length });
}

export async function POST(req: Request) {
  const s = getStore();
  const body = await readJson<{
    symbol?: string; side?: string; type?: string; qty?: number;
    price?: number; stopLoss?: number; takeProfit?: number; reason?: string;
  }>(req);

  const symbol = String(body.symbol || "").toUpperCase();
  const side = String(body.side || "BUY").toUpperCase() as "BUY" | "SELL";
  const type = String(body.type || "MARKET").toUpperCase() as "MARKET" | "LIMIT";
  const qty = Number(body.qty);
  if (!symbol) return apiError("symbol wajib", 400);
  if (side !== "BUY" && side !== "SELL") return apiError("side harus BUY/SELL", 400);
  if (type !== "MARKET" && type !== "LIMIT") return apiError("type harus MARKET/LIMIT", 400);
  if (!(qty > 0)) return apiError("qty harus > 0", 400);
  if (type === "LIMIT" && !(Number(body.price) > 0)) return apiError("limit butuh price", 400);
  if (s.halted) return apiError(`Trading di-halt: ${s.haltedReason || ""}`, 403);
  if (s.engineState !== "RUNNING") return apiError("Engine belum RUNNING — mulai dulu dari Command Center", 409);

  const ticker = await getTickerFor(symbol);
  if (!ticker) return apiError(`Simbol ${symbol} tidak dikenal pasar`, 404);
  const refPrice = type === "LIMIT" ? Number(body.price) : ticker.lastPrice;

  // SL/TP wajib: pakai input user atau derivasi ATR 1.5x / 3x
  let stopLoss = Number(body.stopLoss) > 0 ? Number(body.stopLoss) : null;
  let takeProfit = Number(body.takeProfit) > 0 ? Number(body.takeProfit) : null;
  if (stopLoss === null || takeProfit === null) {
    try {
      const candles = await getKline(symbol, "15", 60);
      const a = lastFinite(atr(candles, 14));
      if (Number.isFinite(a) && a > 0) {
        if (stopLoss === null) stopLoss = refPrice - a * 1.5;
        if (takeProfit === null) takeProfit = refPrice + a * 3;
      }
    } catch {
      // abaikan, validasi di bawah akan menolak
    }
  }

  // Semua order manual tetap melewati Risk Engine (non-bypassable)
  const pseudo: TradeSignal = {
    id: `manual-${Date.now()}`, symbol, action: "LONG", confidence: 100,
    entry: refPrice, stopLoss: stopLoss || 0, takeProfit: takeProfit || 0,
    riskReward: 2, strategy: "MANUAL", marketRegime: "SIDEWAYS",
    invalidation: "manual", scores: {
      technical: 0, momentum: 0, orderFlow: 0, regime: 0,
      news: 0, strategyFit: 0, riskReward: 0, liquidity: 0,
    },
    reasons: ["manual order"], state: "RISK_VALIDATION", mode: s.mode,
    createdAt: new Date().toISOString(),
  };
  const v = validateSignal(pseudo, s.riskConfig, {
    account: s.account,
    openPositions: paper.openPositions(s),
    equity: paper.equityOf(s),
    ticker,
    qtyHint: qty,
  });
  if (!v.approved) return apiError(`Ditolak Risk Engine: ${v.reasons.join("; ")}`, 422);

  const res = paper.placeManualOrder(
    s, { symbol, side, type, qty, price: Number(body.price) || null, reason: body.reason }, refPrice, s.riskConfig,
    { stopLoss, takeProfit }
  );
  if (!res.ok) return apiError(res.error, 422);
  pushEvent("INFO", "ORDER", `Manual ${type} ${side} ${symbol} qty ${qty} (${res.order.id})`);
  if (res.position) {
    pushNotification("TRADE", "INFO", `${symbol} posisi terbuka (manual)`, `${res.position.side} ${qty} @${res.position.entryPrice.toFixed(4)}`);
    addJournal({
      id: `jn-${Date.now()}-manual`,
      tradeId: res.position.id,
      symbol,
      mode: s.mode,
      strategy: "MANUAL",
      marketRegime: "SIDEWAYS",
      scores: pseudo.scores,
      entry: res.position.entryPrice,
      stopLoss: res.position.stopLoss,
      takeProfit: res.position.takeProfit,
      qty: res.position.qty,
      riskUsd: Math.round(Math.abs(refPrice - (stopLoss || refPrice)) * res.position.qty * 100) / 100,
      feeUsd: Math.round(res.order.feeUsd * 100) / 100,
      slippageUsd: Math.round(res.order.slippageUsd * 100) / 100,
      reasoning: `Manual ${type} ${side} dari UI trading`,
      evidence: [`Risk Engine APPROVED (${v.checks.length} checks)`],
      result: "OPEN",
      pnl: null,
      pnlPct: null,
      durationMs: null,
      confidence: 100,
      createdAt: new Date().toISOString(),
      closedAt: null,
    });
  }
  return ok({ order: res.order, position: res.position }, { riskChecks: v.checks.length });
}

export async function DELETE(req: Request) {
  const s = getStore();
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return apiError("parameter id wajib", 400);
  const done = paper.cancelOrder(s, id);
  if (!done) return apiError("Order tidak ditemukan atau tidak bisa dibatalkan", 404);
  pushEvent("INFO", "ORDER", `Order ${id} dibatalkan`);
  return ok({ id, status: "CANCELLED" });
}
