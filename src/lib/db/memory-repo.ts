// ============================================================
// SOFIA 2.0 — Memory / knowledge / decisions Postgres repo
// (TASK-003 / PRD §21-23). CRUD minimal + pencarian teks.
// Tanpa DB → kembalikan fallback aman (null / []). Tidak throw.
// ============================================================

import { getPool } from "./pool";

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ---------- Memory ----------
export interface MemoryInput {
  scope?: string;
  kind?: string;
  content: string;
  importance?: number;
  expiresAt?: string | null;
}

export async function saveMemory(m: MemoryInput): Promise<string | null> {
  const pool = getPool();
  if (!pool) return null;
  const id = newId("mem");
  try {
    await pool.query(
      `INSERT INTO memory_entries (id, scope, kind, content, importance, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, m.scope ?? "user", m.kind ?? "fact", m.content,
       m.importance ?? 0, m.expiresAt ?? null]
    );
    return id;
  } catch (err) {
    console.warn(`[db] saveMemory gagal: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

export async function searchMemory(query: string, limit = 10): Promise<Array<Record<string, unknown>>> {
  const pool = getPool();
  if (!pool) return [];
  try {
    const r = await pool.query(
      `SELECT * FROM memory_entries
       WHERE (expires_at IS NULL OR expires_at > now())
         AND content ILIKE $1
       ORDER BY importance DESC, updated_at DESC LIMIT $2`,
      [`%${query}%`, limit]
    );
    return r.rows as Array<Record<string, unknown>>;
  } catch {
    return [];
  }
}

// ---------- Knowledge ----------
export async function saveKnowledge(title: string, content: string, source = "manual", sourceRef?: string): Promise<string | null> {
  const pool = getPool();
  if (!pool) return null;
  const id = newId("kb");
  try {
    await pool.query(
      `INSERT INTO knowledge_docs (id, title, source, source_ref, content)
       VALUES ($1,$2,$3,$4,$5)`,
      [id, title, source, sourceRef ?? null, content]
    );
    return id;
  } catch (err) {
    console.warn(`[db] saveKnowledge gagal: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

export async function searchKnowledge(query: string, limit = 10): Promise<Array<Record<string, unknown>>> {
  const pool = getPool();
  if (!pool) return [];
  try {
    const r = await pool.query(
      `SELECT * FROM knowledge_docs
       WHERE title ILIKE $1 OR content ILIKE $1
       ORDER BY updated_at DESC LIMIT $2`,
      [`%${query}%`, limit]
    );
    return r.rows as Array<Record<string, unknown>>;
  } catch {
    return [];
  }
}

// ---------- Decisions ----------
export async function saveDecision(
  title: string, context: string, options: unknown, rationale: string, chosen?: string
): Promise<string | null> {
  const pool = getPool();
  if (!pool) return null;
  const id = newId("dec");
  try {
    await pool.query(
      `INSERT INTO decisions (id, title, context, options, chosen, rationale, status)
       VALUES ($1,$2,$3,$4,$5,$6,'decided')`,
      [id, title, context, JSON.stringify(options ?? []), chosen ?? null, rationale]
    );
    return id;
  } catch (err) {
    console.warn(`[db] saveDecision gagal: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

export async function listDecisions(limit = 20): Promise<Array<Record<string, unknown>>> {
  const pool = getPool();
  if (!pool) return [];
  try {
    const r = await pool.query(`SELECT * FROM decisions ORDER BY created_at DESC LIMIT $1`, [limit]);
    return r.rows as Array<Record<string, unknown>>;
  } catch {
    return [];
  }
}
