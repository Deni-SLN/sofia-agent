// ============================================================
// SOFIA 2.0 — Postgres AI usage ledger (TASK-003 / PRD §19-20)
// ai_requests (per-request) + ai_costs (agregat harian).
// Sumber tunggal untuk ledger AI — menggantikan ai-usage-repo.ts
// (duplikat dihapus sesuai PRD §56 "Duplicate state"). Tanpa DB
// → no-op + summary dari state memori ai-store V1. Tidak throw.
// ============================================================

import { budgetStatus, getRouterState } from "@/lib/core/ai-store";
import { getPool } from "./pool";

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export interface AiRequestRecord {
  task: string;
  providerId: string;
  model: string;
  cached: boolean;
  inTokens: number;
  outTokens: number;
  costUsd: number;
  latencyMs: number | null;
  ok: boolean;
  error?: string | null;
  requestId?: string | null;
}

/** Catat satu request LLM + naikkan agregat harian (transaksi). */
export async function recordAiRequest(r: AiRequestRecord): Promise<boolean> {
  const pool = getPool();
  if (!pool) return false;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO ai_requests (id, task, provider_id, model, cached, in_tokens, out_tokens,
        cost_usd, latency_ms, ok, error, request_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [newId("ai"), r.task, r.providerId, r.model, r.cached, r.inTokens, r.outTokens,
       r.costUsd, r.latencyMs, r.ok, r.error ?? null, r.requestId ?? null]
    );
    await client.query(
      `INSERT INTO ai_costs (day, cost_usd, requests, cache_hits, by_provider)
       VALUES (CURRENT_DATE, $1, 1, $2, $3)
       ON CONFLICT (day) DO UPDATE SET
         cost_usd = ai_costs.cost_usd + EXCLUDED.cost_usd,
         requests = ai_costs.requests + 1,
         cache_hits = ai_costs.cache_hits + EXCLUDED.cache_hits,
         by_provider = ai_costs.by_provider || EXCLUDED.by_provider,
         updated_at = now()`,
      [r.cached ? 0 : r.costUsd, r.cached ? 1 : 0,
       JSON.stringify({ [r.providerId]: { costUsd: r.cached ? 0 : r.costUsd, requests: 1, errors: r.ok ? 0 : 1 } })]
    );
    await client.query("COMMIT");
    return true;
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch { /* abaikan */ }
    console.warn(`[db] recordAiRequest gagal: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  } finally {
    client.release();
  }
}

export interface AiUsageSummary {
  source: "postgres" | "memory";
  today: { costUsd: number; requests: number; cacheHits: number };
  budget: { dailyPct: number; monthlyPct: number; blocked: boolean; reason: string | null };
}

/** Ringkasan pemakaian hari ini — Postgres bila ada, memori bila tidak. */
export async function aiUsageSummary(): Promise<AiUsageSummary> {
  const s = getRouterState();
  const b = budgetStatus(s);
  const mem = (): AiUsageSummary => ({
    source: "memory",
    today: { costUsd: s.usageToday.costUsd, requests: s.usageToday.requests, cacheHits: s.usageToday.cacheHits },
    budget: { dailyPct: b.dailyPct, monthlyPct: b.monthlyPct, blocked: b.blocked, reason: b.reason },
  });
  const pool = getPool();
  if (!pool) return mem();
  try {
    const r = await pool.query(`SELECT cost_usd, requests, cache_hits FROM ai_costs WHERE day = CURRENT_DATE`);
    const row = r.rows[0] as { cost_usd?: string | number; requests?: number; cache_hits?: number } | undefined;
    return {
      source: "postgres",
      today: { costUsd: Number(row?.cost_usd ?? 0), requests: Number(row?.requests ?? 0), cacheHits: Number(row?.cache_hits ?? 0) },
      budget: { dailyPct: b.dailyPct, monthlyPct: b.monthlyPct, blocked: b.blocked, reason: b.reason },
    };
  } catch {
    return mem();
  }
}

