// ============================================================
// SOFIA Trade — Paper Trading Engine (PRD §24)
// Simulasi fee taker 0.1%, slippage 0.05%, spread, likuiditas.
// Akuntansi: balance (cash) + unrealized = equity.
// Fee dibayar dua arah (entry + exit) seperti exchange nyata.
// ============================================================

import type {
  PaperAccount,
  PaperOrder,
  PaperPosition,
  RiskConfig,
  Ticker,
  TradeSignal,
  TradeSizing,
} from "./types";

export interface PaperState {
  account: PaperAccount;
  orders: PaperOrder[];
  positions: PaperPosition[];
}

export function newAccount(startingBalanceIdr: number, rate: number): PaperAccount {
  const startingBalanceUsd = Math.round((startingBalanceIdr / Math.max(rate, 1)) * 100) / 100;
  const now = new Date().toISOString();
  return {
    id: `paper-${Date.now()}`,
    balanceUsd: startingBalanceUsd,
    startingBalanceUsd,
    startingBalanceIdr,
    realizedPnl: 0,
    feesPaid: 0,
    dayDate: now.slice(0, 10),
    dayStartEquity: startingBalanceUsd,
    dailyPnl: 0,
    consecutiveLosses: 0,
    maxEquityUsd: startingBalanceUsd,
    createdAt: now,
  };
}

export function openPositions(s: PaperState): PaperPosition[] {
  return s.positions.filter((p) => p.status === "OPEN");
}

export function equityOf(s: PaperState): number {
  const unreal = openPositions(s).reduce(
    (sum, p) => sum + (p.currentPrice - p.entryPrice) * p.qty,
    0
  );
  return s.account.balanceUsd + unreal;
}

export function ensureDayRollover(s: PaperState, nowIso?: string): void {
  const d = (nowIso || new Date().toISOString()).slice(0, 10);
  if (s.account.dayDate === d) return;
  s.account.dayDate = d;
  s.account.dayStartEquity = equityOf(s);
}

export function refreshDailyPnl(s: PaperState): void {
  const eq = equityOf(s);
  s.account.dailyPnl = eq - s.account.dayStartEquity;
}

export function openFromSignal(
  s: PaperState,
  signal: TradeSignal,
  sizing: TradeSizing,
  cfg: RiskConfig
): { ok: true; order: PaperOrder; position: PaperPosition } | { ok: false; error: string } {
  const now = new Date().toISOString();
  const fill = signal.entry * (1 + cfg.slippagePct / 100);
  const notional = sizing.qty * fill;
  const entryFee = (notional * cfg.takerFeePct) / 100;

  if (s.account.balanceUsd < notional + entryFee) {
    return { ok: false, error: "Balance tidak cukup untuk notional + fee" };
  }
  s.account.balanceUsd -= notional + entryFee;
  s.account.feesPaid += entryFee;

  const order: PaperOrder = {
    id: `ord-${Date.now()}`,
    symbol: signal.symbol,
    side: "BUY",
    type: "MARKET",
    qty: sizing.qty,
    price: null,
    stopLoss: signal.stopLoss,
    takeProfit: signal.takeProfit,
    status: "FILLED",
    filledQty: sizing.qty,
    avgFillPrice: fill,
    feeUsd: entryFee,
    slippageUsd: Math.abs(fill - signal.entry) * sizing.qty,
    signalId: signal.id,
    reason: `Auto ${signal.strategy} conf=${signal.confidence}`,
    createdAt: now,
    filledAt: now,
  };
  const position: PaperPosition = {
    id: `pos-${Date.now()}`,
    symbol: signal.symbol,
    side: "LONG",
    qty: sizing.qty,
    entryPrice: fill,
    currentPrice: fill,
    takeProfit: signal.takeProfit,
    stopLoss: signal.stopLoss,
    trailingStopPct: cfg.trailingStopPct > 0 ? cfg.trailingStopPct : null,
    trailingStopPrice: null,
    peakPrice: fill,
    unrealizedPnl: 0,
    realizedPnl: null,
    feeUsd: entryFee,
    signalId: signal.id,
    strategy: signal.strategy,
    marketRegime: signal.marketRegime,
    status: "OPEN",
    openedAt: now,
    closedAt: null,
    closePrice: null,
    closeReason: null,
  };
  s.orders.unshift(order);
  s.positions.unshift(position);
  return { ok: true, order, position };
}

export interface ManualOrderRequest {
  symbol: string;
  side: "BUY" | "SELL";
  type: "MARKET" | "LIMIT";
  qty: number;
  price?: number | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
  reason?: string;
}

export function placeManualOrder(
  s: PaperState,
  req: ManualOrderRequest,
  fillPrice: number,
  cfg: RiskConfig,
  slTp: { stopLoss: number | null; takeProfit: number | null }
): { ok: true; order: PaperOrder; position: PaperPosition | null } | { ok: false; error: string } {
  const now = new Date().toISOString();
  if (!(req.qty > 0)) return { ok: false, error: "Qty harus > 0" };
  if (req.type === "LIMIT" && !(req.price && req.price > 0)) {
    return { ok: false, error: "Limit order wajib menyertakan price" };
  }

  const order: PaperOrder = {
    id: `ord-${Date.now()}`,
    symbol: req.symbol,
    side: req.side,
    type: req.type,
    qty: req.qty,
    price: req.type === "LIMIT" ? req.price || null : null,
    stopLoss: slTp.stopLoss ?? null,
    takeProfit: slTp.takeProfit ?? null,
    status: req.type === "MARKET" ? "FILLED" : "OPEN",
    filledQty: req.type === "MARKET" ? req.qty : 0,
    avgFillPrice: req.type === "MARKET" ? fillPrice : null,
    feeUsd: 0,
    slippageUsd: 0,
    signalId: null,
    reason: req.reason || "Manual order",
    createdAt: now,
    filledAt: req.type === "MARKET" ? now : null,
  };
  s.orders.unshift(order);

  if (req.type === "LIMIT") return { ok: true, order, position: null };

  // MARKET BUY -> buka posisi long (V1 long-only)
  if (req.side === "SELL") {
    return { ok: false, error: "V1 long-only: SELL hanya untuk menutup posisi" };
  }
  const fill = fillPrice * (1 + cfg.slippagePct / 100);
  const notional = req.qty * fill;
  const fee = (notional * cfg.takerFeePct) / 100;
  if (s.account.balanceUsd < notional + fee) {
    order.status = "REJECTED";
    return { ok: false, error: "Balance tidak cukup" };
  }
  s.account.balanceUsd -= notional + fee;
  s.account.feesPaid += fee;
  order.feeUsd = fee;
  order.slippageUsd = Math.abs(fill - fillPrice) * req.qty;

  const position: PaperPosition = {
    id: `pos-${Date.now()}`,
    symbol: req.symbol,
    side: "LONG",
    qty: req.qty,
    entryPrice: fill,
    currentPrice: fill,
    takeProfit: slTp.takeProfit,
    stopLoss: slTp.stopLoss,
    trailingStopPct: cfg.trailingStopPct > 0 ? cfg.trailingStopPct : null,
    trailingStopPrice: null,
    peakPrice: fill,
    unrealizedPnl: 0,
    realizedPnl: null,
    feeUsd: fee,
    signalId: null,
    strategy: "MANUAL",
    marketRegime: "SIDEWAYS",
    status: "OPEN",
    openedAt: now,
    closedAt: null,
    closePrice: null,
    closeReason: null,
  };
  s.positions.unshift(position);
  return { ok: true, order, position };
}

export function updatePrices(s: PaperState, tickers: Ticker[]): void {
  const map = new Map(tickers.map((t) => [t.symbol, t.lastPrice]));
  for (const p of s.positions) {
    if (p.status !== "OPEN") continue;
    const px = map.get(p.symbol);
    if (!Number.isFinite(px) || (px as number) <= 0) continue;
    const price = px as number;
    p.currentPrice = price;
    if (price > p.peakPrice) p.peakPrice = price;
    // Trailing stop: kunci profit saat harga naik
    if (p.trailingStopPct && p.trailingStopPct > 0) {
      const candidate = p.peakPrice * (1 - p.trailingStopPct / 100);
      if (!p.trailingStopPrice || candidate > p.trailingStopPrice) {
        p.trailingStopPrice = candidate;
      }
    }
    p.unrealizedPnl = (price - p.entryPrice) * p.qty;
  }
}

export function monitorPositions(
  s: PaperState,
  tickers: Ticker[],
  cfg: RiskConfig
): PaperPosition[] {
  updatePrices(s, tickers);
  const closed: PaperPosition[] = [];
  for (const p of s.positions) {
    if (p.status !== "OPEN") continue;
    const px = p.currentPrice;
    let reason: string | null = null;
    if (p.takeProfit !== null && px >= p.takeProfit) reason = "TP_HIT";
    else if (p.stopLoss !== null && px <= p.stopLoss) reason = "SL_HIT";
    else if (p.trailingStopPrice !== null && px <= p.trailingStopPrice) reason = "TRAILING_STOP";
    if (reason) {
      closePosition(s, p.id, px, reason, cfg.takerFeePct);
      closed.push(p);
    }
  }
  return closed;
}

export function closePosition(
  s: PaperState,
  positionId: string,
  exitPrice: number,
  reason: string,
  takerFeePct: number
): { ok: true; realized: number; exitFee: number } | { ok: false; error: string } {
  const p = s.positions.find((x) => x.id === positionId);
  if (!p || p.status !== "OPEN") return { ok: false, error: "Posisi tidak ditemukan/sudah closed" };
  const exitValue = p.qty * exitPrice;
  const exitFee = (exitValue * takerFeePct) / 100;
  s.account.balanceUsd += exitValue - exitFee;
  s.account.feesPaid += exitFee;
  const realized = (exitPrice - p.entryPrice) * p.qty - exitFee;
  p.currentPrice = exitPrice;
  p.unrealizedPnl = 0;
  p.realizedPnl = realized;
  p.status = "CLOSED";
  p.closePrice = exitPrice;
  p.closedAt = new Date().toISOString();
  p.closeReason = reason;
  p.feeUsd += exitFee;
  s.account.realizedPnl += realized;
  if (realized < 0) s.account.consecutiveLosses += 1;
  else s.account.consecutiveLosses = 0;
  return { ok: true, realized, exitFee };
}

export function cancelOrder(s: PaperState, orderId: string): boolean {
  const o = s.orders.find((x) => x.id === orderId);
  if (!o || o.status !== "OPEN") return false;
  o.status = "CANCELLED";
  return true;
}

export function fillLimitOrders(s: PaperState, tickers: Ticker[], cfg: RiskConfig): PaperOrder[] {
  const filled: PaperOrder[] = [];
  const map = new Map(tickers.map((t) => [t.symbol, t.lastPrice]));
  for (const o of s.orders) {
    if (o.status !== "OPEN" || o.type !== "LIMIT" || o.price === null) continue;
    if (o.side !== "BUY") continue; // V1 long-only: SELL limit tidak diproses
    const px = map.get(o.symbol);
    if (!Number.isFinite(px) || (px as number) <= 0) continue;
    const price = px as number;
    const touch = price <= (o.price as number);
    if (!touch) continue;
    const fee = ((o.qty * price * cfg.takerFeePct) / 100) || 0;
    const notional = o.qty * price;
    if (s.account.balanceUsd < notional + fee) {
      o.status = "REJECTED";
      continue;
    }
    s.account.balanceUsd -= notional + fee;
    s.account.feesPaid += fee;
    o.status = "FILLED";
    o.filledQty = o.qty;
    o.avgFillPrice = price;
    o.feeUsd = fee;
    o.filledAt = new Date().toISOString();
    filled.push(o);
    // Limit BUY yang ter-fill membuka posisi long (SL/TP bawaan order)
    const nowPos = new Date().toISOString();
    s.positions.unshift({
      id: `pos-${Date.now()}-${o.id}`,
      symbol: o.symbol,
      side: "LONG",
      qty: o.qty,
      entryPrice: price,
      currentPrice: price,
      takeProfit: o.takeProfit,
      stopLoss: o.stopLoss,
      trailingStopPct: cfg.trailingStopPct > 0 ? cfg.trailingStopPct : null,
      trailingStopPrice: null,
      peakPrice: price,
      unrealizedPnl: 0,
      realizedPnl: null,
      feeUsd: fee,
      signalId: o.signalId,
      strategy: "MANUAL",
      marketRegime: "SIDEWAYS",
      status: "OPEN",
      openedAt: nowPos,
      closedAt: null,
      closePrice: null,
      closeReason: null,
    });
  }
  return filled;
}


