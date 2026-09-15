// ============================================================
// SOFIA 2.0 — Service registry (TASK-002 / PRD §42)
// 8 layanan dalam satu daftar untuk /api/health/services.
// Semua check paralel + timeout; satu layanan mati tidak
// menggagalkan yang lain (graceful degradation, PRD §63).
// ============================================================

import type { ServiceClient, ServiceHealth } from "./types";
import { PaperclipClient } from "./paperclip";
import { HermesViaPaperclipClient } from "./hermes";
import { NineRouterClient } from "./router9";
import { OpenRouterClient } from "./openrouter";
import { LocalLlmClient } from "./local-llm";
import { N8nClient } from "./n8n";
import { PostgresClient } from "./postgres";
import { RedisClient } from "./redis";

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
      try {
        const r = await c.check();
        return { name: c.name, ...r };
      } catch (err) {
        return {
          name: c.name,
          status: "offline",
          latencyMs: null,
          detail: err instanceof Error ? err.message : "check failed",
        };
      }
    })
  );
  return results;
}

export function overallStatus(services: ServiceHealth[]): "healthy" | "degraded" | "down" {
  if (services.every((s) => s.status === "online")) return "healthy";
  if (services.every((s) => s.status === "offline")) return "down";
  return "degraded";
}
