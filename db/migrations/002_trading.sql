-- ---------- Trading: positions / journal / signals ----------
CREATE TABLE IF NOT EXISTS trade_positions (
  id            text PRIMARY KEY,
  symbol        text NOT NULL,
  side          text NOT NULL,
  qty           numeric NOT NULL DEFAULT 0,
  entry_price   numeric NOT NULL DEFAULT 0,
  current_price numeric NOT NULL DEFAULT 0,
  take_profit   numeric,
  stop_loss     numeric,
  trailing_stop_pct numeric,
  trailing_stop_price numeric,
  peak_price    numeric NOT NULL DEFAULT 0,
  unrealized_pnl numeric NOT NULL DEFAULT 0,
  realized_pnl  numeric,
  fee_usd       numeric NOT NULL DEFAULT 0,
  signal_id     text,
  strategy      text NOT NULL DEFAULT '',
  market_regime text NOT NULL DEFAULT '',
  status        text NOT NULL DEFAULT 'OPEN',
  opened_at     timestamptz NOT NULL DEFAULT now(),
  closed_at     timestamptz,
  close_price   numeric,
  close_reason  text,
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trade_positions_symbol_idx ON trade_positions (symbol);
CREATE INDEX IF NOT EXISTS trade_positions_status_idx ON trade_positions (status);
DROP TRIGGER IF EXISTS trg_trade_positions_touch ON trade_positions;
CREATE TRIGGER trg_trade_positions_touch
  BEFORE UPDATE ON trade_positions
  FOR EACH ROW EXECUTE FUNCTION sofia_touch_updated_at();

CREATE TABLE IF NOT EXISTS journal_entries (
  id            text PRIMARY KEY,
  trade_id      text,
  symbol        text NOT NULL DEFAULT '',
  mode          text NOT NULL DEFAULT 'PAPER',
  strategy      text NOT NULL DEFAULT '',
  market_regime text NOT NULL DEFAULT '',
  scores        jsonb NOT NULL DEFAULT '{}'::jsonb,
  entry_price   numeric NOT NULL DEFAULT 0,
  stop_loss     numeric,
  take_profit   numeric,
  qty           numeric NOT NULL DEFAULT 0,
  risk_usd      numeric NOT NULL DEFAULT 0,
  fee_usd       numeric NOT NULL DEFAULT 0,
  slippage_usd  numeric NOT NULL DEFAULT 0,
  reasoning     text NOT NULL DEFAULT '',
  evidence      jsonb NOT NULL DEFAULT '[]'::jsonb,
  result        text NOT NULL DEFAULT 'OPEN',
  pnl           numeric,
  pnl_pct       numeric,
  duration_ms   bigint,
  confidence    numeric NOT NULL DEFAULT 0,
  raw           jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  closed_at     timestamptz,
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS journal_entries_symbol_idx ON journal_entries (symbol);
CREATE INDEX IF NOT EXISTS journal_entries_result_idx ON journal_entries (result);
DROP TRIGGER IF EXISTS trg_journal_entries_touch ON journal_entries;
CREATE TRIGGER trg_journal_entries_touch
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION sofia_touch_updated_at();

CREATE TABLE IF NOT EXISTS trade_signals (
  id            text PRIMARY KEY,
  symbol        text NOT NULL,
  action        text NOT NULL,
  confidence    numeric NOT NULL DEFAULT 0,
  entry_price   numeric NOT NULL DEFAULT 0,
  stop_loss     numeric NOT NULL DEFAULT 0,
  take_profit   numeric NOT NULL DEFAULT 0,
  risk_reward   numeric NOT NULL DEFAULT 0,
  strategy      text NOT NULL DEFAULT '',
  market_regime text NOT NULL DEFAULT '',
  invalidation  text NOT NULL DEFAULT '',
  scores        jsonb NOT NULL DEFAULT '{}'::jsonb,
  reasons       jsonb NOT NULL DEFAULT '[]'::jsonb,
  state         text NOT NULL DEFAULT 'SIGNAL_CREATED',
  mode          text NOT NULL DEFAULT 'PAPER',
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trade_signals_symbol_idx ON trade_signals (symbol);
CREATE INDEX IF NOT EXISTS trade_signals_created_idx ON trade_signals (created_at DESC);
