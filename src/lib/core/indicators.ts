// ============================================================
// SOFIA Trade — Deterministic technical indicators
// Perhitungan numerik SELALU deterministic (PRD §12.2, §61.14).
// Semua fungsi mengembalikan array sepanjang input, NaN = warmup.
// ============================================================

import type { Candle } from "./types";

export function sma(values: number[], period: number): number[] {
  const out = new Array<number>(values.length).fill(NaN);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

export function ema(values: number[], period: number): number[] {
  const out = new Array<number>(values.length).fill(NaN);
  if (values.length < period || period <= 0) return out;
  const k = 2 / (period + 1);
  let prev = 0;
  for (let i = 0; i < period; i++) prev += values[i];
  prev /= period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

export function rsi(values: number[], period = 14): number[] {
  const out = new Array<number>(values.length).fill(NaN);
  if (values.length <= period) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = values[i] - values[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  gain /= period;
  loss /= period;
  out[period] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  for (let i = period + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    gain = (gain * (period - 1) + Math.max(d, 0)) / period;
    loss = (loss * (period - 1) + Math.max(-d, 0)) / period;
    out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  }
  return out;
}

function trueRanges(candles: Candle[]): number[] {
  const out = new Array<number>(candles.length).fill(NaN);
  if (candles.length === 0) return out;
  out[0] = candles[0].high - candles[0].low;
  for (let i = 1; i < candles.length; i++) {
    const h = candles[i].high;
    const l = candles[i].low;
    const pc = candles[i - 1].close;
    out[i] = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
  }
  return out;
}

export function atr(candles: Candle[], period = 14): number[] {
  const tr = trueRanges(candles);
  const out = new Array<number>(candles.length).fill(NaN);
  if (candles.length <= period) return out;
  let sum = 0;
  for (let i = 1; i <= period; i++) sum += tr[i];
  let prev = sum / period;
  out[period] = prev;
  for (let i = period + 1; i < candles.length; i++) {
    prev = (prev * (period - 1) + tr[i]) / period;
    out[i] = prev;
  }
  return out;
}

export function macd(
  values: number[],
  fast = 12,
  slow = 26,
  signalPeriod = 9
): { macd: number[]; signal: number[]; hist: number[] } {
  const emaFast = ema(values, fast);
  const emaSlow = ema(values, slow);
  const macdLine = values.map((_, i) =>
    Number.isFinite(emaFast[i]) && Number.isFinite(emaSlow[i]) ? emaFast[i] - emaSlow[i] : NaN
  );
  const validIdx: number[] = [];
  const validVals: number[] = [];
  for (let i = 0; i < macdLine.length; i++) {
    if (Number.isFinite(macdLine[i])) {
      validIdx.push(i);
      validVals.push(macdLine[i]);
    }
  }
  const sigValid = ema(validVals, signalPeriod);
  const signal = new Array<number>(values.length).fill(NaN);
  for (let j = 0; j < validIdx.length; j++) signal[validIdx[j]] = sigValid[j];
  const hist = macdLine.map((v, i) =>
    Number.isFinite(v) && Number.isFinite(signal[i]) ? v - signal[i] : NaN
  );
  return { macd: macdLine, signal, hist };
}

export function bollinger(
  values: number[],
  period = 20,
  mult = 2
): { upper: number[]; middle: number[]; lower: number[] } {
  const middle = sma(values, period);
  const upper = new Array<number>(values.length).fill(NaN);
  const lower = new Array<number>(values.length).fill(NaN);
  for (let i = period - 1; i < values.length; i++) {
    const m = middle[i];
    if (!Number.isFinite(m)) continue;
    let sq = 0;
    for (let j = i - period + 1; j <= i; j++) sq += (values[j] - m) ** 2;
    const sd = Math.sqrt(sq / period);
    upper[i] = m + mult * sd;
    lower[i] = m - mult * sd;
  }
  return { upper, middle, lower };
}

export function roc(values: number[], period = 10): number[] {
  const out = new Array<number>(values.length).fill(NaN);
  for (let i = period; i < values.length; i++) {
    const base = values[i - period];
    if (base > 0) out[i] = (values[i] / base - 1) * 100;
  }
  return out;
}

export function highest(values: number[], period: number, endIndex = values.length - 1): number {
  const start = Math.max(0, endIndex - period + 1);
  let h = -Infinity;
  for (let i = start; i <= endIndex; i++) if (values[i] > h) h = values[i];
  return h === -Infinity ? NaN : h;
}

export function lowest(values: number[], period: number, endIndex = values.length - 1): number {
  const start = Math.max(0, endIndex - period + 1);
  let l = Infinity;
  for (let i = start; i <= endIndex; i++) if (values[i] < l) l = values[i];
  return l === Infinity ? NaN : l;
}

export function lastFinite(arr: number[]): number {
  for (let i = arr.length - 1; i >= 0; i--) if (Number.isFinite(arr[i])) return arr[i];
  return NaN;
}

export function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}
