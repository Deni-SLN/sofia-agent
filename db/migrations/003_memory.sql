-- ============================================================
-- SOFIA 2.0 — Memory / knowledge / decisions (TASK-003 / PRD §21-23)
-- Idempotent: CREATE TABLE IF NOT EXISTS + trigger aman diulang.
-- ============================================================

CREATE TABLE IF NOT EXISTS memory_entries (
  id            text PRIMARY KEY,
  scope         text NOT NULL DEFAULT 'user',
  kind          text NOT NULL DEFAULT 'fact',
  content       text NOT NULL,
  embedding     jsonb,
  importance    numeric NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz
);
CREATE INDEX IF NOT EXISTS memory_entries_scope_idx ON memory_entries (scope);
CREATE INDEX IF NOT EXISTS memory_entries_kind_idx ON memory_entries (kind);
DROP TRIGGER IF EXISTS trg_memory_entries_touch ON memory_entries;
CREATE TRIGGER trg_memory_entries_touch
  BEFORE UPDATE ON memory_entries
  FOR EACH ROW EXECUTE FUNCTION sofia_touch_updated_at();

CREATE TABLE IF NOT EXISTS knowledge_docs (
  id            text PRIMARY KEY,
  title         text NOT NULL,
  source        text NOT NULL DEFAULT 'manual',
  source_ref    text,
  content       text NOT NULL,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS trg_knowledge_docs_touch ON knowledge_docs;
CREATE TRIGGER trg_knowledge_docs_touch
  BEFORE UPDATE ON knowledge_docs
  FOR EACH ROW EXECUTE FUNCTION sofia_touch_updated_at();

CREATE TABLE IF NOT EXISTS decisions (
  id            text PRIMARY KEY,
  title         text NOT NULL,
  context       text NOT NULL DEFAULT '',
  options       jsonb NOT NULL DEFAULT '[]'::jsonb,
  chosen        text,
  rationale     text NOT NULL DEFAULT '',
  confidence    numeric NOT NULL DEFAULT 0,
  status        text NOT NULL DEFAULT 'proposed',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS trg_decisions_touch ON decisions;
CREATE TRIGGER trg_decisions_touch
  BEFORE UPDATE ON decisions
  FOR EACH ROW EXECUTE FUNCTION sofia_touch_updated_at();
