// ============================================================
// SOFIA Trade — client hooks & fetchers untuk engine API
// ============================================================

"use client";

import { useQuery } from "@tanstack/react-query";
import type {
  AgentStatus,
  CurrencyState,
  EngineHealth,
  JournalEntry,
  MarketCandidate,
  PaperAccount,
  PaperOrder,
  PaperPosition,
  PerformanceSummary,
  RiskConfig,
  SystemEvent,
  Ticker,
  TradeSignal,
} from "@/lib/core/types";

export interface StatusResponse {
  health: EngineHealth;
  account: PaperAccount & { equity: number; unrealizedPnl: number; openNotional: number };
  positions: PaperPosition[];
  orders: PaperOrder[];
  candidates: MarketCandidate[];
  signals: TradeSignal[];
  events: SystemEvent[];
  agents: AgentStatus[];
  riskConfig: RiskConfig;
  currency: CurrencyState;
}

async function getJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { cache: "no-store", ...init });
  const json = (await res.json()) as { ok: boolean; data?: T; error?: string };
  if (!json.ok) throw new Error(json.error || `Request ${path} gagal`);
  return json.data as T;
}

export function useEngineStatus(refetchMs = 3000) {
  return useQuery({
    queryKey: ["engine-status"],
    queryFn: () => getJSON<StatusResponse>("/api/engine/status"),
    refetchInterval: refetchMs,
    retry: 1,
  });
}

export function useTickers(limit = 30, refetchMs = 10000) {
  return useQuery({
    queryKey: ["tickers", limit],
    queryFn: () => getJSON<Ticker[]>(`/api/market/tickers?limit=${limit}`),
    refetchInterval: refetchMs,
    retry: 1,
  });
}

export function useCandidates(refetchMs = 15000) {
  return useQuery({
    queryKey: ["candidates"],
    queryFn: () => getJSON<MarketCandidate[]>("/api/scanner"),
    refetchInterval: refetchMs,
    retry: 1,
  });
}

export function useJournal() {
  return useQuery({
    queryKey: ["journal"],
    queryFn: () => getJSON<JournalEntry[]>("/api/journal"),
    refetchInterval: 10000,
    retry: 1,
  });
}

export function usePerformance() {
  return useQuery({
    queryKey: ["performance"],
    queryFn: () => getJSON<PerformanceSummary>("/api/performance"),
    refetchInterval: 10000,
    retry: 1,
  });
}

export async function postJSON<T>(path: string, body?: unknown): Promise<T> {
  return getJSON<T>(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body || {}),
  });
}
