import { getStore, pushEvent } from "@/lib/core/store";
import { validateSignal, DEFAULT_RISK_CONFIG } from "@/lib/core/risk-engine";
import { equityOf, openPositions } from "@/lib/core/paper-engine";
import { ok, apiError, readJson } from "@/lib/core/api";
import type { RiskConfig, TradeSignal } from "@/lib/core/types";

export const dynamic = "force-dynamic";

const NUMERIC_KEYS: Array<keyof RiskConfig> = [
  "riskPerTradePct", "maxDailyLossPct", "maxOpenPositions", "maxConsecutiveLosses",
  "minRiskReward", "maxPositionPct", "leverage", "minOrderUsd", "minOrderQty",
  "takerFeePct", "slippagePct", "maxSpreadPct", "minTurnoverUsd",
  "autoTradeMinConfidence", "trailingStopPct", "scanIntervalMs", "cycleIntervalMs",
];

export async function GET() {
  const s = getStore();
  return ok({ config: s.riskConfig, defaults: DEFAULT_RISK_CONFIG });
}

export async function PUT(req: Request) {
  const s = getStore();
  const body = await readJson<Partial<RiskConfig>>(req);
  for (const k of NUMERIC_KEYS) {
    const v = body[k];
    if (v === undefined) continue;
    if (typeof v !== "number" || !Number.isFinite(v)) {
      return apiError(`field ${k} harus angka valid`, 400);
    }
  }
  const next = { ...s.riskConfig, ...body };
  if (next.riskPerTradePct <= 0 || next.riskPerTradePct > 10) return apiError("riskPerTradePct 0..10", 400);
  if (next.maxDailyLossPct <= 0 || next.maxDailyLossPct > 50) return apiError("maxDailyLossPct 0..50", 400);
  if (next.maxOpenPositions < 1 || next.maxOpenPositions > 10) return apiError("maxOpenPositions 1..10", 400);
  if (next.leverage < 1 || next.leverage > 5) return apiError("leverage 1..5", 400);
  if (next.minRiskReward < 1) return apiError("minRiskReward >= 1", 400);
  s.riskConfig = next;
  pushEvent("INFO", "RISK", "Konfigurasi risiko diperbarui");
  return ok({ config: s.riskConfig });
}

export async function POST(req: Request) {
  // Dry-run validasi sinyal tanpa mengeksekusi (PRD: risk validate endpoint)
  const s = getStore();
  const body = await readJson<Partial<TradeSignal>>(req);
  const sig = body as TradeSignal;
  if (!sig.symbol || !Number.isFinite(sig.entry) || !Number.isFinite(sig.stopLoss)) {
    return apiError("butuh symbol, entry, stopLoss, takeProfit", 400);
  }
  const v = validateSignal(
    { ...sig, action: sig.action || "LONG" },
    s.riskConfig,
    { account: s.account, openPositions: openPositions(s), equity: equityOf(s) }
  );
  return ok(v);
}
