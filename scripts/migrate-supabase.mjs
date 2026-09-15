// ============================================================
// SOFIA 2.0 — Migrasi data Supabase V1 -> PostgreSQL/Neon
// (TASK-003 / PRD §57). BACKUP RAW dulu ke legacy_snapshots,
// baru normalisasi ke tabel inti. Idempotent (DO NOTHING).
// Pakai: node scripts/migrate-supabase.mjs
// Butuh .env.local: DATABASE_URL + NEXT_PUBLIC_SUPABASE_URL +
// SUPABASE_SERVICE_ROLE_KEY (atau ANON KEY). Tanpa env Supabase
// -> exit 0 (tidak ada data V1, tidak ada yang dirusak).
// ============================================================
/* eslint-disable no-console */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

function loadEnvLocal() {
  const p = join(process.cwd(), ".env.local");
  if (!existsSync(p)) return {};
  const out = {};
  for (const raw of readFileSync(p, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(k in process.env)) out[k] = v;
  }
  return out;
}

const env = loadEnvLocal();
const url = process.env.DATABASE_URL || env.DATABASE_URL || "";
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY
  || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
if (!url) { console.error("[migrate] DATABASE_URL (Neon) belum diset."); process.exit(1); }
if (!SB_URL || !SB_KEY) {
  console.log("[migrate] Env Supabase kosong — tidak ada data V1 untuk dimigrasi. Selesai (0 perubahan).");
  process.exit(0);
}

const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const needsSsl = (() => {
  let mode = "";
  try { mode = new URL(url).searchParams.get("sslmode") ?? ""; } catch { /* biarkan pool */ }
  if (mode === "disable") return false;
  return ["require", "prefer", "verify-ca", "verify-full"].includes(mode) || (!mode && /neon\.tech/i.test(url));
})();
// TASK-003.5: verifikasi sertifikat ON by default (produksi-aman).
// Dev self-signed: PG_SSL_REJECT_UNAUTHORIZED=false secara eksplisit.
const rejectUnauthorized =
  (process.env.PG_SSL_REJECT_UNAUTHORIZED ?? env.PG_SSL_REJECT_UNAUTHORIZED ?? "true") !== "false";
const pool = new pg.Pool({
  connectionString: url, max: 2, connectionTimeoutMillis: 15000,
  ssl: needsSsl ? { rejectUnauthorized } : undefined,
});

try {
  console.log("[migrate] 1/3 Baca sofia_snapshots + sofia_journal dari Supabase ...");
  const { data: snap, error: e1 } = await sb.from("sofia_snapshots")
    .select("id,payload,updated_at").eq("id", "global-v1").maybeSingle();
  if (e1) { console.error(`[migrate] sofia_snapshots: ${e1.message}`); process.exit(1); }
  const { data: journal, error: e2 } = await sb.from("sofia_journal").select("id,entry");
  if (e2) console.warn(`[migrate] sofia_journal: ${e2.message} (lanjut tanpa arsip)`);
  const p = snap?.payload;
  if (!p || typeof p !== "object") {
    console.log("[migrate] Snapshot 'global-v1' tidak ada/kosong. Selesai (0 perubahan).");
    process.exit(0);
  }

  console.log("[migrate] 2/3 BACKUP RAW -> legacy_snapshots (id='supabase-global-v1') ...");
  await pool.query(
    `INSERT INTO legacy_snapshots (id, source, payload) VALUES ($1,$2,$3) ON CONFLICT (id) DO NOTHING`,
    ["supabase-global-v1", "supabase:sofia_snapshots",
     JSON.stringify({ snapshot: p, journal: journal ?? [], backedUpAt: new Date().toISOString() })]
  );

  console.log("[migrate] 3/3 Normalisasi -> tabel inti ...");
  const n = { engine: 0, orders: 0, positions: 0, journal: 0, signals: 0 };
  const J = (v) => JSON.stringify(v ?? null);
  const acc = p.account ?? {};
  await pool.query(
    `INSERT INTO engine_state (id, engine_state, mode, started_at, halted, halted_reason, live_unlocked, equity_usd, balance_usd)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
    ["global", p.engineState ?? "STOPPED", p.mode ?? "PAPER", p.startedAt ?? null,
     Boolean(p.halted), p.haltedReason ?? null, Boolean(p.liveUnlocked),
     Number(acc.equityUsd ?? 0), Number(acc.balanceUsd ?? 0)]
  );
  n.engine = 1;
  for (const o of (p.orders ?? []).slice(0, 500)) {
    await pool.query(
      `INSERT INTO trade_orders (id, symbol, side, type, qty, price, stop_loss, take_profit, status,
        filled_qty, avg_fill_price, fee_usd, slippage_usd, signal_id, reason, created_at, filled_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) ON CONFLICT (id) DO NOTHING`,
      [o.id, o.symbol, o.side, o.type ?? "MARKET", o.qty ?? 0, o.price ?? null, o.stopLoss ?? null,
       o.takeProfit ?? null, o.status ?? "PENDING", o.filledQty ?? 0, o.avgFillPrice ?? null,
       o.feeUsd ?? 0, o.slippageUsd ?? 0, o.signalId ?? null, o.reason ?? "", o.createdAt, o.filledAt ?? null]
    );
    n.orders++;
  }
  for (const x of (p.positions ?? []).slice(0, 500)) {
    await pool.query(
      `INSERT INTO trade_positions (id, symbol, side, qty, entry_price, current_price, take_profit, stop_loss,
        trailing_stop_pct, trailing_stop_price, peak_price, unrealized_pnl, realized_pnl, fee_usd,
        signal_id, strategy, market_regime, status, opened_at, closed_at, close_price, close_reason)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22) ON CONFLICT (id) DO NOTHING`,
      [x.id, x.symbol, x.side, x.qty ?? 0, x.entryPrice ?? 0, x.currentPrice ?? 0, x.takeProfit ?? null,
       x.stopLoss ?? null, x.trailingStopPct ?? null, x.trailingStopPrice ?? null, x.peakPrice ?? 0,
       x.unrealizedPnl ?? 0, x.realizedPnl ?? null, x.feeUsd ?? 0, x.signalId ?? null,
       x.strategy ?? "", x.marketRegime ?? "", x.status ?? "OPEN", x.openedAt,
       x.closedAt ?? null, x.closePrice ?? null, x.closeReason ?? null]
    );
    n.positions++;
  }
  for (const j of (p.journal ?? []).slice(0, 1000)) {
    await pool.query(
      `INSERT INTO journal_entries (id, trade_id, symbol, mode, strategy, market_regime, scores, entry_price,
        stop_loss, take_profit, qty, risk_usd, fee_usd, slippage_usd, reasoning, evidence, result,
        pnl, pnl_pct, duration_ms, confidence, raw, created_at, closed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24) ON CONFLICT (id) DO NOTHING`,
      [j.id, j.tradeId ?? null, j.symbol ?? "", j.mode ?? "PAPER", j.strategy ?? "", j.marketRegime ?? "",
       J(j.scores), j.entry ?? 0, j.stopLoss ?? null, j.takeProfit ?? null, j.qty ?? 0, j.riskUsd ?? 0,
       j.feeUsd ?? 0, j.slippageUsd ?? 0, j.reasoning ?? "", J(j.evidence), j.result ?? "OPEN",
       j.pnl ?? null, j.pnlPct ?? null, j.durationMs ?? null, j.confidence ?? 0, J(j),
       j.createdAt, j.closedAt ?? null]
    );
    n.journal++;
  }
  for (const sg of (p.signals ?? []).slice(0, 200)) {
    await pool.query(
      `INSERT INTO trade_signals (id, symbol, action, confidence, entry_price, stop_loss, take_profit,
        risk_reward, strategy, market_regime, invalidation, scores, reasons, state, mode, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) ON CONFLICT (id) DO NOTHING`,
      [sg.id, sg.symbol, sg.action, sg.confidence ?? 0, sg.entry ?? 0, sg.stopLoss ?? 0,
       sg.takeProfit ?? 0, sg.riskReward ?? 0, sg.strategy ?? "", sg.marketRegime ?? "",
       sg.invalidation ?? "", J(sg.scores), J(sg.reasons), sg.state ?? "SIGNAL_CREATED",
       sg.mode ?? "PAPER", sg.createdAt]
    );
    n.signals++;
  }
  for (const r of (journal ?? []).slice(0, 2000)) {
    const j = r.entry;
    if (!j || !j.id) continue;
    await pool.query(
      `INSERT INTO journal_entries (id, trade_id, symbol, mode, strategy, result, pnl, raw, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
      [j.id, j.tradeId ?? null, j.symbol ?? "", j.mode ?? "PAPER", j.strategy ?? "",
       j.result ?? "OPEN", j.pnl ?? null, J(j), j.createdAt ?? null]
    );
    n.journal++;
  }
  console.log(`[migrate] SELESAI: ${JSON.stringify(n)} — raw backup aman di legacy_snapshots.`);
} finally {
  await pool.end();
}
