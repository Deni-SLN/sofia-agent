// ============================================================
// SOFIA 2.0 — Service abstraction (TASK-002 + hardening TASK-003.5)
// Satu kontrak health + base client untuk 8 layanan:
// Paperclip, Hermes (via Paperclip), 9Router, OpenRouter, Local LLM,
// n8n, PostgreSQL, Redis.
// Hardening (review TASK-003.5):
//  - "pending" = integrasi BELUM dilakukan (jujur, bukan health palsu)
//  - tier = critical | required | optional (overall health hanya
//    dihitung dari critical+required — PRD §63 graceful degradation)
// ============================================================

export type ServiceStatus = "online" | "offline" | "unconfigured" | "degraded" | "pending";

export type ServiceTier = "critical" | "required" | "optional";

export interface ServiceHealth {
  name: string;
  tier?: ServiceTier;
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
  readonly tier?: ServiceTier;
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

/** Layanan yang integrasinya belum dilakukan — netral, bukan mati. */
export function pendingIntegration(detail: string): ServiceCheckResult {
  return { status: "pending", latencyMs: null, detail };
}
