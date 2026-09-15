import { getStore } from "@/lib/core/store";
import { ok, apiError, readJson } from "@/lib/core/api";
import { getKline } from "@/lib/core/market-data";
import { runBacktest } from "@/lib/core/backtest";
import { getBuiltin } from "@/lib/core/strategies";
import type { BacktestStrategyInput } from "@/lib/core/backtest";

export const dynamic = "force-dynamic";

function norm(sym: string): string {
  const u = sym.trim().toUpperCase();
  if (!u) return "";
  return u.endsWith("USDT") ? u : `${u}USDT`;
}

export async function POST(req: Request) {
  const s = getStore();
  const body = await readJson<{
    symbol?: string; interval?: string; limit?: number; startingBalanceUsd?: number;
    strategy?: { type?: string; id?: string; params?: Record<string, number> };
  }>(req);
  const symbol = norm(String(body.symbol || "BTCUSDT"));
  const interval = String(body.interval || "60");
  const rawLimit = Number(body.limit) || 500;
  const limit = Math.min(Math.max(rawLimit, 100), 1000);
  const startBal = Number(body.startingBalanceUsd) > 0
    ? Number(body.startingBalanceUsd)
    : s.account.startingBalanceUsd || 6;

  // Strategi opsional: {type, params} atau {id} strategi tersimpan/builtin.
  let strategy: BacktestStrategyInput | undefined;
  const st = body.strategy;
  if (st && typeof st === "object") {
    if (st.id) {
      const saved = s.strategies.find((x) => x.id === st.id);
      if (saved) strategy = { type: saved.type, params: saved.params };
      else if (getBuiltin(st.id)) strategy = { type: st.id };
      else return apiError(`Strategi id tidak dikenal: ${st.id}`, 400);
    } else if (st.type) {
      if (!getBuiltin(st.type)) return apiError(`Tipe strategi tidak dikenal: ${st.type}`, 400);
      strategy = { type: st.type, params: st.params };
    }
  }

  if (!/^(15|30|60|240|D)$/.test(interval)) {
    return apiError("interval harus salah satu: 15, 30, 60, 240, D", 400);
  }
  try {
    const candles = await getKline(symbol, interval, limit);
    const result = runBacktest(symbol, interval, candles, s.riskConfig, startBal, strategy);
    return ok(result, { riskNote: "fee 0.1% + slippage 0.05%, SL 1.5xATR / TP 3xATR, max 1 posisi" });
  } catch (e) {
    return apiError(`Backtest gagal: ${String(e)}`, 500);
  }
}
