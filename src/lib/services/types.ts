// ============================================================
// SOFIA 2.0 — Service abstraction (TASK-002 / PRD §3, §5, §42)
// Satu kontrak health + base client untuk 8 layanan:
// Paperclip, Hermes (via Paperclip), 9Router, OpenRouter, Local LLM,
// n8n, PostgreSQL, Redis. Fase ini: kontrak + timeout + degradasi
// graceful, TANPA business feature.
// ============================================================

export type ServiceStatus = "online" | "offline" | "unconfigured" | "degraded";

export interface ServiceHealth {
  name: string;
  status: ServiceStatus;
  latencyMs: number | null;
  detail?: string;
}

export interface ServiceCheckResult {
  status: ServiceStatus;
  latencyMs: number | null;
  detail?: string;
}

export interface ServiceClient {
  readonly name: string;
  /** Cek kesehatan cepat dengan timeout. Tidak boleh throw. */
  check(): Promise<ServiceCheckResult>;
}

export function degradedOr(
  ok: boolean,
  latencyMs: number | null,
  detail?: string
): ServiceCheckResult {
  return { status: ok ? "online" : "offline", latencyMs, detail };
}

export function unconfigured(detail: string): ServiceCheckResult {
  return { status: "unconfigured", latencyMs: null, detail };
}
