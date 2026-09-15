// ============================================================
// SOFIA Trade — Market Data provider (PRD §29, §30)
// Primary: Bybit v5 public REST (ticker + kline, tanpa API key).
// Fallback: data sintetis deterministik agar engine tetap dapat
// didemokan offline (ditandai source = FALLBACK / DEGRADED).
// ============================================================

import type { Candle, DataSource, Ticker } from "./types";

const BASE_URL = process.env.BYBIT_BASE_URL || "https://api.bybit.com";
const TICKER_TTL_MS = 20_000;
const KLINE_TTL_MS = 60_000;

interface CacheEntry<T> {
  ts: number;
  data: T;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string, ttlMs: number): T | null {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < ttlMs) return hit.data as T;
  return null;
}

function setCached<T>(key: string, data: T): void {
  cache.set(key, { ts: Date.now(), data });
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function rnd(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

interface BybitTickerRow {
  symbol: string;
  lastPrice: string;
  prevPrice24h: string;
  price24hPcnt: string;
  volume24h: string;
  turnover24h: string;
  bid1Price: string;
  ask1Price: string;
}

const FALLBACK_UNIVERSE: Array<{ symbol: string; base: number; turnover: number }> = [
  { symbol: "BTCUSDT", base: 103250, turnover: 2_100_000_000 },
  { symbol: "ETHUSDT", base: 3450, turnover: 1_150_000_000 },
  { symbol: "SOLUSDT", base: 182.5, turnover: 480_000_000 },
  { symbol: "BNBUSDT", base: 595, turnover: 320_000_000 },
  { symbol: "XRPUSDT", base: 0.62, turnover: 280_000_000 },
  { symbol: "DOGEUSDT", base: 0.16, turnover: 220_000_000 },
  { symbol: "ADAUSDT", base: 0.45, turnover: 150_000_000 },
  { symbol: "AVAXUSDT", base: 35.2, turnover: 120_000_000 },
  { symbol: "LINKUSDT", base: 16.4, turnover: 110_000_000 },
  { symbol: "TONUSDT", base: 6.8, turnover: 95_000_000 },
  { symbol: "DOTUSDT", base: 7.2, turnover: 80_000_000 },
  { symbol: "LTCUSDT", base: 92, turnover: 75_000_000 },
];

function syntheticTickers(): Ticker[] {
  const bucket = Math.floor(Date.now() / 30_000);
  return FALLBACK_UNIVERSE.map((u) => {
    const s = hash(u.symbol) + bucket;
    const driftPct = (rnd(s) - 0.5) * 6; // -3%..+3% per 30 detik
    const last = u.base * (1 + driftPct / 100);
    const spread = last * 0.0004;
    const dp = last < 1 ? 6 : 2;
    return {
      symbol: u.symbol,
      lastPrice: Number(last.toFixed(dp)),
      price24hPct: Number(driftPct.toFixed(2)),
      volume24h: u.turnover / last,
      turnover24h: u.turnover,
      bid: Number((last - spread / 2).toFixed(dp)),
      ask: Number((last + spread / 2).toFixed(dp)),
      source: "FALLBACK" as DataSource,
    };
  });
}

async function bybitGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(path, BASE_URL);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    headers: { accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Bybit HTTP ${res.status}`);
  const json = (await res.json()) as { retCode: number; retMsg: string; result: T };
  if (json.retCode !== 0) throw new Error(`Bybit ${json.retCode}: ${json.retMsg}`);
  return json.result;
}

function toTicker(row: BybitTickerRow): Ticker | null {
  const lastPrice = parseFloat(row.lastPrice);
  if (!Number.isFinite(lastPrice) || lastPrice <= 0) return null;
  const pct = parseFloat(row.price24hPcnt) * 100;
  return {
    symbol: row.symbol,
    lastPrice,
    price24hPct: Number.isFinite(pct) ? Number(pct.toFixed(2)) : 0,
    volume24h: parseFloat(row.volume24h) || 0,
    turnover24h: parseFloat(row.turnover24h) || 0,
    bid: parseFloat(row.bid1Price) || 0,
    ask: parseFloat(row.ask1Price) || 0,
    source: "BYBIT",
  };
}

export interface MarketSnapshot {
  tickers: Ticker[];
  source: DataSource;
  fetchedAt: string;
  latencyMs: number;
}

let lastSnapshot: MarketSnapshot | null = null;

export async function getTickers(): Promise<MarketSnapshot> {
  const cached = getCached<MarketSnapshot>("tickers", TICKER_TTL_MS);
  if (cached) return cached;
  const t0 = Date.now();
  try {
    const result = await bybitGet<{ list: BybitTickerRow[] }>("/v5/market/tickers", {
      category: "linear",
    });
    const tickers = result.list.map(toTicker).filter((t): t is Ticker => t !== null);
    if (tickers.length === 0) throw new Error("empty ticker list");
    lastSnapshot = {
      tickers,
      source: "BYBIT",
      fetchedAt: new Date().toISOString(),
      latencyMs: Date.now() - t0,
    };
  } catch {
    lastSnapshot = {
      tickers: syntheticTickers(),
      source: "FALLBACK",
      fetchedAt: new Date().toISOString(),
      latencyMs: Date.now() - t0,
    };
  }
  setCached("tickers", lastSnapshot);
  return lastSnapshot;
}

export function getLastSnapshot(): MarketSnapshot | null {
  return lastSnapshot;
}

function intervalToMs(interval: string): number {
  const n = parseInt(interval, 10) || 15;
  if (/^[DWM]$/.test(interval)) return n * 86_400_000;
  return n * 60_000;
}

function syntheticKline(symbol: string, interval: string, limit: number): Candle[] {
  const u = FALLBACK_UNIVERSE.find((x) => x.symbol === symbol);
  const base = u ? u.base : 100;
  const seed = hash(symbol);
  const tf = intervalToMs(interval);
  const now = Date.now();
  const out: Candle[] = [];
  let p = base;
  for (let i = limit - 1; i >= 0; i--) {
    const s1 = rnd(seed + i * 7 + 1);
    const s2 = rnd(seed + i * 7 + 2);
    const s3 = rnd(seed + i * 7 + 3);
    const open = p;
    const close = open * (1 + (s1 - 0.5) * 0.012);
    const high = Math.max(open, close) * (1 + s2 * 0.005);
    const low = Math.min(open, close) * (1 - s3 * 0.005);
    const volume = ((u ? u.turnover / base : 1_000_000) / 96) * (0.4 + s2 * 1.2);
    out.push({ time: now - i * tf, open, high, low, close, volume });
    p = close;
  }
  return out;
}

export async function getKline(symbol: string, interval = "15", limit = 200): Promise<Candle[]> {
  const key = `kline:${symbol}:${interval}:${limit}`;
  const cached = getCached<Candle[]>(key, KLINE_TTL_MS);
  if (cached) return cached;
  let candles: Candle[] = [];
  try {
    const result = await bybitGet<{ list: string[][] }>("/v5/market/kline", {
      category: "linear",
      symbol,
      interval,
      limit: String(limit),
    });
    candles = result.list
      .map((row) => ({
        time: Number(row[0]),
        open: parseFloat(row[1]),
        high: parseFloat(row[2]),
        low: parseFloat(row[3]),
        close: parseFloat(row[4]),
        volume: parseFloat(row[5]),
      }))
      .filter((c) => Number.isFinite(c.close) && c.close > 0)
      .sort((a, b) => a.time - b.time);
  } catch {
    candles = syntheticKline(symbol, interval, limit);
  }
  setCached(key, candles);
  return candles;
}

export async function getTickerFor(symbol: string): Promise<Ticker | null> {
  const snap = await getTickers();
  return snap.tickers.find((t) => t.symbol === symbol) || null;
}

