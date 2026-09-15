-- ============================================================
-- SOFIA 2.0 — AI usage ledger + audit + users (TASK-003 / PRD §19, §44)
-- Idempotent. audit_events append-only (tanpa trigger update).
-- users/api_keys fondasi auth lokal — password_hash diisi TASK-017.
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_requests (
  id            text PRIMARY KEY,
  task          text NOT NULL,
  provider_id   text NOT NULL DEFAULT '',
  model         text NOT NULL DEFAULT '',
  cached        boolean NOT NULL DEFAULT false,
  in_tokens     integer NOT NULL DEFAULT 0,
  out_tokens    integer NOT NULL DEFAULT 0,
  cost_usd      numeric NOT NULL DEFAULT 0,
  latency_ms    integer,
  ok            boolean NOT NULL DEFAULT true,
  error         text,
  request_id    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_requests_created_idx ON ai_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS ai_requests_provider_idx ON ai_requests (provider_id);

CREATE TABLE IF NOT EXISTS ai_costs (
  day           date PRIMARY KEY,
  cost_usd      numeric NOT NULL DEFAULT 0,
  requests      integer NOT NULL DEFAULT 0,
  cache_hits    integer NOT NULL DEFAULT 0,
  by_provider   jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at    timestamptz NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS trg_ai_costs_touch ON ai_costs;
CREATE TRIGGER trg_ai_costs_touch
  BEFORE UPDATE ON ai_costs
  FOR EACH ROW EXECUTE FUNCTION sofia_touch_updated_at();

CREATE TABLE IF NOT EXISTS audit_events (
  id            text PRIMARY KEY,
  event         text NOT NULL,
  actor         text,
  service       text NOT NULL DEFAULT 'sofia',
  request_id    text,
  fields        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_events_event_idx ON audit_events (event);
CREATE INDEX IF NOT EXISTS audit_events_created_idx ON audit_events (created_at DESC);

CREATE TABLE IF NOT EXISTS users (
  id            text PRIMARY KEY,
  email         text UNIQUE,
  password_hash text,
  role          text NOT NULL DEFAULT 'user',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS trg_users_touch ON users;
CREATE TRIGGER trg_users_touch
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION sofia_touch_updated_at();

CREATE TABLE IF NOT EXISTS api_keys (
  id            text PRIMARY KEY,
  user_id       text REFERENCES users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  key_hash      text NOT NULL,
  scopes        jsonb NOT NULL DEFAULT '[]'::jsonb,
  revoked       boolean NOT NULL DEFAULT false,
  last_used_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS api_keys_user_idx ON api_keys (user_id);

CREATE TABLE IF NOT EXISTS ai_provider_state (
  provider_id   text PRIMARY KEY,
  active        boolean NOT NULL DEFAULT true,
  priority      integer NOT NULL DEFAULT 100,
  model         text NOT NULL DEFAULT '',
  updated_at    timestamptz NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS trg_ai_provider_state_touch ON ai_provider_state;
CREATE TRIGGER trg_ai_provider_state_touch
  BEFORE UPDATE ON ai_provider_state
  FOR EACH ROW EXECUTE FUNCTION sofia_touch_updated_at();

CREATE TABLE IF NOT EXISTS legacy_snapshots (
  id            text PRIMARY KEY,
  source        text NOT NULL DEFAULT 'supabase:sofia_snapshots',
  payload       jsonb NOT NULL,
  imported_at   timestamptz NOT NULL DEFAULT now()
);
