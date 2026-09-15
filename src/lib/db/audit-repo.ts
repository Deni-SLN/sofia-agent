// ============================================================
// SOFIA 2.0 — Postgres audit repository (TASK-003 / PRD §44)
// Append-only 13 event wajib. Tanpa DB → fallback ke logger audit
// (perilaku TASK-002). Tidak throw.
// ============================================================

import type { AuditEvent } from "@/lib/core/logger";
import { audit as auditLog } from "@/lib/core/logger";
import { getPool } from "./pool";

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export interface AuditRecord {
  event: AuditEvent;
  actor?: string;
  requestId?: string;
  fields?: Record<string, unknown>;
}

export async function writeAudit(rec: AuditRecord): Promise<boolean> {
  // Selalu ke log terstruktur (fallback + visibilitas ganda bila DB ada).
  auditLog(rec.event, {
    service: "sofia-audit",
    requestId: rec.requestId,
    actor: rec.actor,
    ...rec.fields,
  });
  const pool = getPool();
  if (!pool) return false;
  try {
    await pool.query(
      `INSERT INTO audit_events (id, event, actor, service, request_id, fields)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [newId("aud"), rec.event, rec.actor ?? null, "sofia", rec.requestId ?? null,
       JSON.stringify(rec.fields ?? {})]
    );
    return true;
  } catch (err) {
    console.warn(`[db] writeAudit gagal: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

export async function listAudit(limit = 50): Promise<Array<Record<string, unknown>>> {
  const pool = getPool();
  if (!pool) return [];
  try {
    const r = await pool.query(`SELECT * FROM audit_events ORDER BY created_at DESC LIMIT $1`, [limit]);
    return r.rows as Array<Record<string, unknown>>;
  } catch {
    return [];
  }
}
