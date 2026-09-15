-- ============================================================
-- SOFIA 2.0 — PostgreSQL schema (TASK-003 / PRD §39, §57)
-- Dijalankan via migrasi berurutan (npm run db:migrate).
-- Kompatibel PostgreSQL 14+ (Neon, Docker, self-hosted).
-- Idempotent: CREATE TABLE IF NOT EXISTS — aman diulang.
-- Data Supabase V1 diimpor scripts/migrate-supabase.mjs (backup dulu).
-- ============================================================

-- ---------- Util ----------
-- updated_at otomatis
CREATE OR REPLACE FUNCTION sofia_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------- Engine state (pengganti snapshot blob global-v1) ----------
CREATE TABLE IF NOT EXISTS engine_state (
  id            text PRIMARY KEY,
  engine_state  text NOT NULL DEFAULT 'STOPPED',
  mode          text NOT NULL DEFAULT 'PAPER',
  started_at    timestamptz,
  halted        boolean NOT NULL DEFAULT false,
  halted_reason text,
  live_unlocked boolean NOT NULL DEFAULT false,
  equity_usd    numeric NOT NULL DEFAULT 0,
  balance_usd   numeric NOT NULL DEFAULT 0,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_engine_state_touch ON engine_state;
CREATE TRIGGER trg_engine_state_touch
  BEFORE UPDATE ON engine_state
  FOR EACH ROW EXECUTE FUNCTION sofia_touch_updated_at();

-- ---------- Trading: orders ----------
CREATE TABLE IF NOT EXISTS trade_orders (
  id            text PRIMARY KEY,
  symbol        text NOT NULL,
  side          text NOT NULL,
  type          text NOT NULL DEFAULT 'MARKET',
  qty           numeric NOT NULL DEFAULT 0,
  price         numeric,
  stop_loss     numeric,
  take_profit   numeric,
  status        text NOT NULL DEFAULT 'PENDING',
  filled_qty    numeric NOT NULL DEFAULT 0,
  avg_fill_price numeric,
  fee_usd       numeric NOT NULL DEFAULT 0,
  slippage_usd  numeric NOT NULL DEFAULT 0,
  signal_id     text,
  reason        text NOT NULL DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now(),
  filled_at     timestamptz,
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trade_orders_symbol_idx ON trade_orders (symbol);
CREATE INDEX IF NOT EXISTS trade_orders_status_idx ON trade_orders (status);
DROP TRIGGER IF EXISTS trg_trade_orders_touch ON trade_orders;
CREATE TRIGGER trg_trade_orders_touch
  BEFORE UPDATE ON trade_orders
  FOR EACH ROW EXECUTE FUNCTION sofia_touch_updated_at();
