// ============================================================
// SOFIA Trade — Strategy Builder core (PRD §7.6) bagian 1/2
// Strategi builtin deterministik utk backtest. Semua sinyal dari
// indikator — tanpa LLM. Setiap strategi menyiapkan array
// enter/exit per bar agar backtest tetap O(n).
// ============================================================
import type { Candle } from "./types";
import { ema, macd, rsi, bollinger, sma, highest, lowest } from "./indicators";

export interface StrategyParamDef {
  key: string;
  label: string;
  def: number;
  min: number;
  max: number;
  step: number;
}
export interface PreparedSignals {
  enter: boolean[];
  exit: boolean[];
  reasons: string[];
  startIdx: number;
}
export interface BuiltinStrategy {
  id: string;
  name: string;
  desc: string;
  params: StrategyParamDef[];
  prepare(candles: Candle[], p: Record<string, number>): PreparedSignals;
}
export interface SavedStrategy {
  id: string;
  name: string;
  type: string;
  params: Record<string, number>;
  createdAt: string;
}

export function boolArr(n: number): boolean[] {
  return new Array<boolean>(n).fill(false);
}
function num(p: Record<string, number>, k: string, def: number): number {
  const v = Number(p[k]);
  return Number.isFinite(v) && v > 0 ? v : def;
}
export function clampParam(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export const BUILTIN_STRATEGIES: BuiltinStrategy[] = [
  {
    id: "MA_CROSS",
    name: "MA Crossover",
    desc: "Entry saat EMA fast memotong ke atas EMA slow; exit saat memotong ke bawah.",
    params: [
      { key: "fast", label: "EMA fast", def: 9, min: 2, max: 100, step: 1 },
      { key: "slow", label: "EMA slow", def: 21, min: 3, max: 200, step: 1 },
    ],
    prepare(candles, p) {
      const fast = clampParam(Math.round(num(p, "fast", 9)), 2, 100);
      const slow = clampParam(Math.round(num(p, "slow", 21)), 3, 200);
      const closes = candles.map((c) => c.close);
      const ef = ema(closes, fast);
      const es = ema(closes, slow);
      const n = candles.length;
      const out: PreparedSignals = { enter: boolArr(n), exit: boolArr(n), reasons: [], startIdx: Math.max(fast, slow) };
      for (let i = 1; i < n; i++) {
        if (![ef[i], es[i], ef[i - 1], es[i - 1]].every(Number.isFinite)) continue;
        if (ef[i - 1] <= es[i - 1] && ef[i] > es[i]) {
          out.enter[i] = true;
          out.reasons[i] = `EMA${fast} cross up EMA${slow}`;
        } else if (ef[i - 1] >= es[i - 1] && ef[i] < es[i]) {
          out.exit[i] = true;
          out.reasons[i] = `EMA${fast} cross down EMA${slow}`;
        }
      }
      return out;
    },
  },
  {
    id: "RSI_REVERSAL",
    name: "RSI Reversal",
    desc: "Entry saat RSI keluar dari oversold ke atas threshold; exit saat overbought.",
    params: [
      { key: "period", label: "Periode RSI", def: 14, min: 2, max: 50, step: 1 },
      { key: "buyBelow", label: "Buy saat lewat dari", def: 35, min: 10, max: 60, step: 1 },
      { key: "exitAbove", label: "Exit saat lewat dari", def: 65, min: 50, max: 90, step: 1 },
    ],
    prepare(candles, p) {
      const period = clampParam(Math.round(num(p, "period", 14)), 2, 50);
      const buyBelow = clampParam(num(p, "buyBelow", 35), 10, 60);
      const exitAbove = clampParam(num(p, "exitAbove", 65), 50, 90);
      const r = rsi(candles.map((c) => c.close), period);
      const n = candles.length;
      const out: PreparedSignals = { enter: boolArr(n), exit: boolArr(n), reasons: [], startIdx: period + 1 };
      for (let i = 1; i < n; i++) {
        if (!Number.isFinite(r[i]) || !Number.isFinite(r[i - 1])) continue;
        if (r[i - 1] < buyBelow && r[i] >= buyBelow) {
          out.enter[i] = true;
          out.reasons[i] = `RSI ${r[i].toFixed(0)} rebound dari ${r[i - 1].toFixed(0)}`;
        } else if (r[i] >= exitAbove) {
          out.exit[i] = true;
          out.reasons[i] = `RSI ${r[i].toFixed(0)} >= ${exitAbove}`;
        }
      }
      return out;
    },
  },
  {
    id: "MACD_CROSS",
    name: "MACD Signal Cross",
    desc: "Entry saat histogram MACD memotong ke atas nol; exit saat memotong ke bawah.",
    params: [
      { key: "fast", label: "EMA fast", def: 12, min: 5, max: 50, step: 1 },
      { key: "slow", label: "EMA slow", def: 26, min: 10, max: 100, step: 1 },
      { key: "signal", label: "Periode signal", def: 9, min: 3, max: 30, step: 1 },
    ],
    prepare(candles, p) {
      const closes = candles.map((c) => c.close);
      const m = macd(closes, Math.round(num(p, "fast", 12)), Math.round(num(p, "slow", 26)), Math.round(num(p, "signal", 9)));
      const n = candles.length;
      const out: PreparedSignals = { enter: boolArr(n), exit: boolArr(n), reasons: [], startIdx: 30 };
      for (let i = 1; i < n; i++) {
        if (![m.hist[i], m.hist[i - 1]].every(Number.isFinite)) continue;
        if (m.hist[i - 1] <= 0 && m.hist[i] > 0) {
          out.enter[i] = true;
          out.reasons[i] = "MACD hist cross up 0";
        } else if (m.hist[i - 1] >= 0 && m.hist[i] < 0) {
          out.exit[i] = true;
          out.reasons[i] = "MACD hist cross down 0";
        }
      }
      return out;
    },
  },
  {
    id: "BOLLINGER_BREAKOUT",
    name: "Bollinger Breakout",
    desc: "Entry saat close menembus upper band; exit saat close di bawah middle band.",
    params: [
      { key: "period", label: "Periode", def: 20, min: 5, max: 100, step: 1 },
      { key: "mult", label: "Deviasi (x)", def: 2, min: 1, max: 4, step: 0.1 },
    ],
    prepare(candles, p) {
      const closes = candles.map((c) => c.close);
      const b = bollinger(closes, Math.round(num(p, "period", 20)), num(p, "mult", 2));
      const n = candles.length;
      const out: PreparedSignals = { enter: boolArr(n), exit: boolArr(n), reasons: [], startIdx: 25 };
      for (let i = 1; i < n; i++) {
        if (![b.upper[i], b.middle[i], closes[i], closes[i - 1]].every(Number.isFinite)) continue;
        if (closes[i - 1] <= b.upper[i - 1] && closes[i] > b.upper[i]) {
          out.enter[i] = true;
          out.reasons[i] = `Breakout upper band ${b.upper[i].toFixed(4)}`;
        } else if (closes[i] < b.middle[i]) {
          out.exit[i] = true;
          out.reasons[i] = "Close di bawah middle band";
        }
      }
      return out;
    },
  },
  {
    id: "VOLUME_SPIKE",
    name: "Volume Spike",
    desc: "Entry saat volume jauh di atas rata-rata dengan candle bullish di atas EMA20.",
    params: [
      { key: "mult", label: "Kelipatan volume", def: 1.5, min: 1, max: 5, step: 0.1 },
      { key: "maPeriod", label: "MA volume", def: 20, min: 5, max: 100, step: 1 },
    ],
    prepare(candles, p) {
      const mult = clampParam(num(p, "mult", 1.5), 1, 5);
      const maPeriod = clampParam(Math.round(num(p, "maPeriod", 20)), 5, 100);
      const vols = candles.map((c) => c.volume);
      const closes = candles.map((c) => c.close);
      const mv = sma(vols, maPeriod);
      const e20 = ema(closes, 20);
      const n = candles.length;
      const out: PreparedSignals = { enter: boolArr(n), exit: boolArr(n), reasons: [], startIdx: Math.max(maPeriod, 21) };
      for (let i = 1; i < n; i++) {
        if (![mv[i], e20[i]].every(Number.isFinite)) continue;
        const bullish = closes[i] > candles[i].open;
        if (vols[i] > mv[i] * mult && bullish && closes[i] > e20[i]) {
          out.enter[i] = true;
          out.reasons[i] = `Volume ${vols[i].toFixed(0)} > ${mult}x rata-rata`;
        } else if (closes[i] < e20[i]) {
          out.exit[i] = true;
          out.reasons[i] = "Close di bawah EMA20";
        }
      }
      return out;
    },
  },
  {
    id: "DONCHIAN_BREAKOUT",
    name: "Donchian Breakout",
    desc: "Entry saat close menembus high N-bar terakhir; exit saat menembus low N-bar.",
    params: [{ key: "period", label: "Periode channel", def: 20, min: 5, max: 100, step: 1 }],
    prepare(candles, p) {
      const period = clampParam(Math.round(num(p, "period", 20)), 5, 100);
      const highs = candles.map((c) => c.high);
      const lows = candles.map((c) => c.low);
      const closes = candles.map((c) => c.close);
      const n = candles.length;
      const out: PreparedSignals = { enter: boolArr(n), exit: boolArr(n), reasons: [], startIdx: period + 1 };
      for (let i = period; i < n; i++) {
        const hi = highest(highs, period, i - 1);
        const lo = lowest(lows, period, i - 1);
        if (!Number.isFinite(hi) || !Number.isFinite(lo)) continue;
        if (closes[i] > hi) {
          out.enter[i] = true;
          out.reasons[i] = `Breakout high ${period}-bar ${hi.toFixed(4)}`;
        } else if (closes[i] < lo) {
          out.exit[i] = true;
          out.reasons[i] = `Breakdown low ${period}-bar`;
        }
      }
      return out;
    },
  },
];

export function getBuiltin(id: string): BuiltinStrategy | null {
  return BUILTIN_STRATEGIES.find((s) => s.id === id.toUpperCase()) || null;
}
export function normalizeParams(b: BuiltinStrategy, raw?: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of b.params) {
    const v = Number(raw?.[d.key]);
    out[d.key] = Number.isFinite(v) ? clampParam(v, d.min, d.max) : d.def;
  }
  return out;
}