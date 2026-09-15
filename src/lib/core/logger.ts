// ============================================================
// SOFIA 2.0 — Structured logger (TASK-002 / PRD §44, §55)
// Format JSON satu baris: { timestamp, service, event, ...fields }.
// Secret TIDAK PERNAH ditulis: redaksi otomatis untuk key/token/secret.
// Menggantikan console.warn ad-hoc bertahap (V1 tetap jalan).
// ============================================================

const SECRET_KEY_RE = /(api[_-]?key|apikey|secret|token|password|passwd|auth|credential|private[_-]?key)/i;

function redactValue(key: string, value: unknown): unknown {
  if (SECRET_KEY_RE.test(key)) return "[REDACTED]";
  if (typeof value === "string" && value.length > 400) return value.slice(0, 400) + "…[truncated]";
  if (Array.isArray(value)) return value.map((v) => redactValue(key, v));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = redactValue(k, v);
    return out;
  }
  return value;
}

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogFields {
  model?: string;
  requestId?: string;
  latencyMs?: number;
  service?: string;
  errorCode?: string;
  [key: string]: unknown;
}

function emit(level: LogLevel, event: string, fields: LogFields = {}): void {
  const { service = "sofia", ...rest } = fields;
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rest)) safe[k] = redactValue(k, v);
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    service,
    event,
    ...safe,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (event: string, fields?: LogFields) => emit("debug", event, fields),
  info: (event: string, fields?: LogFields) => emit("info", event, fields),
  warn: (event: string, fields?: LogFields) => emit("warn", event, fields),
  error: (event: string, fields?: LogFields) => emit("error", event, fields),
};

/** 13 event audit wajib PRD §44 — dipakai fase berikutnya untuk audit trail. */
export const AUDIT_EVENTS = [
  "USER_LOGIN",
  "MODEL_REQUEST",
  "MODEL_FAILURE",
  "MODEL_FALLBACK",
  "AGENT_STARTED",
  "AGENT_COMPLETED",
  "TASK_CREATED",
  "TASK_COMPLETED",
  "TRADING_STARTED",
  "TRADING_STOPPED",
  "LIVE_UNLOCKED",
  "EMERGENCY_STOP",
  "API_KEY_CHANGED",
] as const;

export type AuditEvent = (typeof AUDIT_EVENTS)[number];

/** Emit audit event terstruktur (tahap fondasi: ke log; persistensi di fase DB). */
export function audit(event: AuditEvent, fields: LogFields = {}): void {
  emit("info", `audit.${event}`, { service: "sofia-audit", ...fields });
}
