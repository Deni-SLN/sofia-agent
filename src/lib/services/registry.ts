// ============================================================
// SOFIA 2.0 — Service registry (TASK-002 + hardening TASK-003.5)
// 8 layanan dengan TIER: critical / required / optional.
// Overall health HANYA dihitung dari critical+required — layanan
// opsional (local LLM, n8n, redis, openrouter) yang sengaja belum
// dikonfigurasi TIDAK membuat SOFIA tampak unhealthy
// (PRD §63 graceful degradation; review TASK-003.5 §4-5).
// ============================================================

import type { ServiceClient, ServiceHealth, ServiceTier } from "./types";
import { PaperclipClient } from "./paperclip";
import { HermesViaPaperclipClient } from "./hermes";
import { NineRouterClient } from "./router9";
import { OpenRouterClient } from "./openrouter";
import { LocalLlmClient } from "./local-llm";
import { N8nClient } from "./n8n";
import { PostgresClient } from "./postgres";
import { RedisClient } from "./redis";

/** Tier per layanan (review TASK-003.5: critical/required/optional). */
const TIERS: Record<string, ServiceTier> = {
  database: "critical", // SOFIA tidak persist tanpa ini
  router: "required", // 9Router = gateway LLM utama (PRD §14)
  paperclip: "required", // control plane agents (PRD §12)
  hermes: "required", // via Paperclip (PRD §13)
  openrouter: "optional", // fallback cloud pool (PRD §15)
  local_llm: "optional", // opsional (PRD §16)
  n8n: "optional", // otomasi (PRD §34) — SOFIA tetap jalan tanpa n8n
  redis: "optional", // cache/queue opsional (PRD §40)
};

export function getServiceClients(): ServiceClient[] {
  return [
    new PaperclipClient(),
    new HermesViaPaperclipClient(),
    new NineRouterClient(),
    new OpenRouterClient(),
    new LocalLlmClient(),
    new N8nClient(),
    new PostgresClient(),
    new RedisClient(),
  ];
}

export async function checkAllServices(): Promise<ServiceHealth[]> {
  const clients = getServiceClients();
  const results = await Promise.all(
    clients.map(async (c): Promise<ServiceHealth> => {
      const tier: ServiceTier = c.tier ?? TIERS[c.name] ?? "required";
      try {
        const r = await c.check();
        return { name: c.name, tier, ...r };
      } catch (err) {
        return {
          name: c.name,
          tier,
          status: "offline",
          latencyMs: null,
          detail: err instanceof Error ? err.message : "check failed",
        };
      }
    })
  );
  return results;
}

export type OverallHealth = "healthy" | "degraded" | "down";

/**
 * Status agregat BERDASARKAN TIER (bukan "semua layanan"):
 * - critical offline               -> "down"
 * - required offline/unconfigured  -> "degraded" (kapabilitas hilang — jujur)
 * - "pending" / optional apa pun   -> netral (tidak memengaruhi)
 */
export function overallStatus(services: ServiceHealth[]): OverallHealth {
  const core = services.filter((s) => (s.tier ?? "required") !== "optional");
  if (core.some((s) => s.tier === "critical" && s.status === "offline")) return "down";
  if (core.some((s) => s.status === "offline" || s.status === "unconfigured" || s.status === "degraded"))
    return "degraded";
  return "healthy";
}
