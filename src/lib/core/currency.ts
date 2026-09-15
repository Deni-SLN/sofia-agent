// ============================================================
// SOFIA Trade — Currency Engine (PRD §31)
// Base value: USD/USDT. Display currency: IDR.
// FX rate TIDAK di-hardcode; diambil dari API dengan cache.
// Nilai FALLBACK hanya dipakai bila API gagal (ditandai stale).
// ============================================================

import type { CurrencyState } from "./types";

const TTL_MS = 60 * 60 * 1000; // refresh 1 jam
const FALLBACK_RATE = 16_250; // hanya untuk first-run offline, ditandai FALLBACK

const g = globalThis as unknown as { __sofiaCurrency?: CurrencyState };

function initState(): CurrencyState {
  return {
    usdIdr: FALLBACK_RATE,
    source: "FALLBACK",
    fetchedAt: new Date(0).toISOString(),
  };
}

export function getUsdIdrSync(): CurrencyState {
  if (!g.__sofiaCurrency) g.__sofiaCurrency = initState();
  return g.__sofiaCurrency;
}

export async function getUsdIdr(force = false): Promise<CurrencyState> {
  const state = getUsdIdrSync();
  const age = Date.now() - new Date(state.fetchedAt).getTime();
  if (!force && state.source === "API" && age < TTL_MS) return state;
  if (!force && state.source === "FALLBACK" && age < TTL_MS && state.fetchedAt !== new Date(0).toISOString()) {
    return state;
  }
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`FX HTTP ${res.status}`);
    const json = (await res.json()) as { rates?: { IDR?: number } };
    const idr = Number(json?.rates?.IDR);
    if (Number.isFinite(idr) && idr > 1000) {
      state.usdIdr = idr;
      state.source = "API";
      state.fetchedAt = new Date().toISOString();
    }
  } catch {
    // keep previous value; source stays as-is (stale ditandai oleh fetchedAt)
    if (state.fetchedAt === new Date(0).toISOString()) {
      state.fetchedAt = new Date().toISOString();
    }
  }
  return state;
}
