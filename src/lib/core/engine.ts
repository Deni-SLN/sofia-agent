// ============================================================
// SOFIA Trade — Engine Orchestrator (PRD §50)
// Loop otonom: scan -> analisis -> risk -> eksekusi ->
// monitor -> jurnal. Interval default 30 detik, scan 5 menit.
// ============================================================

import type { TradingMode } from "./types";
import { getStore, pushEvent, pushNotification, recordSignal, addJournal, closeJournalTrade, touchAgent, agentError, updateAgent } from "./store";
import { getTickers, getKline } from "./market-data";
import { getUsdIdr } from "./currency";
import { scanMarkets } from "./scanner";
import { analyze } from "./decision";
import { validateSignal, dailyPnlPct, DEFAULT_RISK_CONFIG } from "./risk-engine";
import * as paper from "./paper-engine";

const g = globalThis as unknown as { __sofiaEngine?: SofiaEngine };

class SofiaEngine {
  private timer: ReturnType<typeof setInterval> | null = null;
  private cycleRunning = false;
  private scanning = false;

  isRunning(): boolean {
    return getStore().engineState === "RUNNING";
  }

  async start(mode: TradingMode): Promise<void> {
    const s = getStore();
    if (s.engineState === "RUNNING" || s.engineState === "STARTING") {
      throw new Error("Engine sudah berjalan");
    }
    if (mode === "LIVE") {
      if (!s.liveUnlocked) throw new Error("Mode LIVE butuh autorisasi eksplisit (unlock dulu)");
      throw new Error("Mode LIVE belum didukung di V1 — gunakan PAPER");
    }
    if (s.halted) throw new Error(`Trading di-halt: ${s.haltedReason || "circuit breaker"}`);

    s.mode = mode;
    s.engineState = "STARTING";
    pushEvent("INFO", "ENGINE", `Memulai SOFIA dalam mode ${mode}`);

    try {
      const [tick, cur] = await Promise.all([getTickers(), getUsdIdr()]);
      s.marketSource = tick.source;
      s.lastTickersAt = tick.fetchedAt;
      pushEvent(
        "INFO",
        "MARKET",
        `Market data: ${tick.tickers.length} simbol via ${tick.source} (${tick.latencyMs}ms)`
      );
      pushEvent("INFO", "FX", `Kurs USD/IDR ${cur.usdIdr} via ${cur.source}`);
      paper.ensureDayRollover(s);
    } catch (e) {
      s.engineState = "STOPPED";
      pushEvent("ERROR", "ENGINE", `Health check gagal: ${String(e)}`);
      throw e;
    }

    s.engineState = "RUNNING";
    s.startedAt = new Date().toISOString();
    s.stats.cycles = 0;
    for (const a of s.agents) updateAgent(a.name, { status: "IDLE" });
    pushEvent("INFO", "ENGINE", "SOFIA RUNNING — loop otonom aktif");
    pushNotification("SYSTEM", "INFO", "Engine mulai", `SOFIA running (${mode}) — loop otonom aktif`);

    this.timer = setInterval(() => void this.cycle(), s.riskConfig.cycleIntervalMs);
    void this.cycle();
  }

  stop(reason = "manual"): void {
    const s = getStore();
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (s.engineState === "RUNNING" || s.engineState === "STARTING") {
      s.engineState = "STOPPED";
      pushEvent("INFO", "ENGINE", `Engine dihentikan (${reason})`);
      pushNotification("SYSTEM", "INFO", "Engine dihentikan", reason);
    }
    for (const a of s.agents) updateAgent(a.name, { status: "OFFLINE" });
  }

  emergencyStop(reason = "manual emergency stop"): void {
    const s = getStore();
    s.halted = true;
    s.haltedReason = reason;
    s.engineState = "HALTED";
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    for (const a of s.agents) updateAgent(a.name, { status: "OFFLINE" });
    pushEvent("ERROR", "ENGINE", `EMERGENCY STOP: ${reason}. Semua trading baru diblokir.`);
    pushNotification("RISK", "ERROR", "EMERGENCY STOP", `${reason} — trading baru diblokir (HALTED)`);
  }

  clearHalt(): void {
    const s = getStore();
    s.halted = false;
    s.haltedReason = null;
    s.engineState = "STOPPED";
    pushEvent("INFO", "ENGINE", "Halt dicabut — engine siap dimulai kembali");
  }

  haltTrading(reason: string): void {
    const s = getStore();
    if (s.halted) return;
    s.halted = true;
    s.haltedReason = reason;
    pushEvent("ERROR", "RISK", `CIRCUIT BREAKER: trading baru dihentikan — ${reason}`);
    pushNotification("RISK", "ERROR", "Circuit breaker aktif", reason);
  }

  private async cycle(): Promise<void> {
    const s = getStore();
    if (s.engineState !== "RUNNING" || this.cycleRunning) return;
    this.cycleRunning = true;
    s.stats.cycles += 1;
    try {
      const tick = await getTickers();
      s.marketSource = tick.source;
      s.lastTickersAt = tick.fetchedAt;
      paper.ensureDayRollover(s);

      // Monitor posisi: TP/SL/trailing (PRD §50 tahap monitor)
      const t0 = Date.now();
      paper.fillLimitOrders(s, tick.tickers, s.riskConfig);
      const closed = paper.monitorPositions(s, tick.tickers, s.riskConfig);
      touchAgent("Position Monitor", `cek ${paper.openPositions(s).length} posisi`, Date.now() - t0);
      for (const p of closed) {
        const realized = p.realizedPnl || 0;
        closeJournalTrade(p.id, {
          result: realized > 0 ? "WIN" : realized < 0 ? "LOSS" : "BREAKEVEN",
          pnl: Math.round(realized * 100) / 100,
          pnlPct:
            p.entryPrice > 0
              ? Math.round(((p.closePrice || 0) / p.entryPrice - 1) * 10000) / 100
              : null,
          durationMs:
            p.closedAt && p.openedAt
              ? new Date(p.closedAt).getTime() - new Date(p.openedAt).getTime()
              : null,
          closedAt: p.closedAt,
        });
        pushEvent(
          realized >= 0 ? "INFO" : "WARN",
          "TRADE",
          `${p.symbol} CLOSED ${p.closeReason} @${p.closePrice} pnl $${realized.toFixed(2)}`
        );
        pushNotification(
          "TRADE",
          realized >= 0 ? "INFO" : "WARN",
          `${p.symbol} ditutup (${p.closeReason || "auto"})`,
          `${p.closePrice ? `@${p.closePrice.toFixed(4)}` : ""} pnl ${realized >= 0 ? "+" : ""}$${realized.toFixed(2)}`
        );
      }

      // Circuit breaker harian (PRD §27)
      const eq = paper.equityOf(s);
      if (eq > s.account.maxEquityUsd) s.account.maxEquityUsd = eq;
      paper.refreshDailyPnl(s);
      const dPnl = dailyPnlPct(s.account, eq);
      if (!s.halted && dPnl <= -s.riskConfig.maxDailyLossPct) {
        this.haltTrading(`daily loss ${dPnl.toFixed(2)}% menyentuh limit -${s.riskConfig.maxDailyLossPct}%`);
      }
      if (!s.halted && s.account.consecutiveLosses >= s.riskConfig.maxConsecutiveLosses) {
        this.haltTrading(`${s.account.consecutiveLosses}x loss beruntun`);
      }

      // Scan sesuai jadwal
      const scanDue =
        !s.lastScanAt ||
        Date.now() - new Date(s.lastScanAt).getTime() >= s.riskConfig.scanIntervalMs;
      if (scanDue && !this.scanning && !s.halted) {
        await this.scanAndTrade(tick.tickers);
      }
      touchAgent("Risk Engine", "monitor batas harian", 0);
    } catch (e) {
      s.stats.errors += 1;
      agentError("Execution Engine", "cycle gagal");
      pushEvent("ERROR", "ENGINE", `Cycle error: ${String(e)}`);
    } finally {
      this.cycleRunning = false;
    }
  }

  private async scanAndTrade(tickers: import("./types").Ticker[]): Promise<void> {
    const s = getStore();
    this.scanning = true;
    try {
      const t0 = Date.now();
      const cands = scanMarkets(tickers, s.riskConfig);
      s.candidates = cands;
      s.lastScanAt = new Date().toISOString();
      touchAgent("Scanner", `${cands.length} kandidat`, Date.now() - t0);
      if (cands.length === 0) return;

      for (const c of cands.slice(0, 3)) {
        if (paper.openPositions(s).length >= s.riskConfig.maxOpenPositions) break;
        try {
          const a0 = Date.now();
          const candles = await getKline(c.symbol, "15", 200);
          const sig = analyze({ symbol: c.symbol, candles, ticker: c.ticker, mode: s.mode });
          recordSignal(sig);
          touchAgent("Decision", `${c.symbol} ${sig.action} ${sig.confidence}`, Date.now() - a0);
          for (const an of ["Technical", "Momentum", "Order Flow", "Regime", "Strategy"]) {
            touchAgent(an, c.symbol, 0);
          }
          if (sig.action === "WAIT" || sig.action === "NO_TRADE") continue;
          if (sig.confidence < s.riskConfig.autoTradeMinConfidence) {
            sig.state = "REJECTED";
            pushEvent("WARN", "DECISION", `${c.symbol} conf ${sig.confidence} < min — dilewati`);
            continue;
          }
          pushNotification("SIGNAL", "INFO", `Sinyal ${sig.action} ${c.symbol}`, `Conf ${sig.confidence} (${sig.strategy}) — divalidasi risk engine`);
          const eq = paper.equityOf(s);
          const tickerMap = new Map(tickers.map((t) => [t.symbol, t]));
          const v = validateSignal(sig, s.riskConfig, {
            account: s.account,
            openPositions: paper.openPositions(s),
            equity: eq,
            ticker: tickerMap.get(c.symbol),
          });
          if (!v.approved) {
            sig.state = "REJECTED";
            touchAgent("Risk Engine", `${c.symbol} REJECTED`, 0);
            pushEvent("WARN", "RISK", `${c.symbol} DITOLAK: ${v.reasons.join("; ")}`);
            pushNotification("RISK", "WARN", `${c.symbol} ditolak risk engine`, v.reasons.slice(0, 2).join("; "));
            continue;
          }
          sig.state = "APPROVED";
          const res = paper.openFromSignal(s, sig, v.sizing, s.riskConfig);
          if (!res.ok) {
            sig.state = "REJECTED";
            pushEvent("ERROR", "EXECUTION", `${c.symbol} gagal: ${res.error}`);
            continue;
          }
          sig.state = "POSITION_OPEN";
          addJournal({
            id: `jn-${Date.now()}`,
            tradeId: res.position.id,
            symbol: c.symbol,
            mode: s.mode,
            strategy: sig.strategy,
            marketRegime: sig.marketRegime,
            scores: sig.scores,
            entry: res.position.entryPrice,
            stopLoss: res.position.stopLoss,
            takeProfit: res.position.takeProfit,
            qty: res.position.qty,
            riskUsd: Math.round(v.sizing.riskUsd * 100) / 100,
            feeUsd: Math.round(res.order.feeUsd * 100) / 100,
            slippageUsd: Math.round(res.order.slippageUsd * 100) / 100,
            reasoning: `Auto entry conf=${sig.confidence} R:R 1:${sig.riskReward}`,
            evidence: sig.reasons,
            result: "OPEN",
            pnl: null,
            pnlPct: null,
            durationMs: null,
            confidence: sig.confidence,
            createdAt: new Date().toISOString(),
            closedAt: null,
          });
          touchAgent("Execution Engine", `${c.symbol} FILLED`, 0);
          touchAgent("Journal", `${c.symbol} logged`, 0);
          pushEvent("INFO", "TRADE", `${c.symbol} LONG @${res.position.entryPrice} qty ${res.position.qty} (${sig.strategy})`);
          pushNotification("TRADE", "INFO", `${c.symbol} posisi terbuka`, `LONG ${res.position.qty} @${res.position.entryPrice.toFixed(4)} · SL ${res.position.stopLoss?.toFixed(4)} · TP ${res.position.takeProfit?.toFixed(4)}`);
        } catch (e) {
          agentError("Decision", c.symbol);
          pushEvent("ERROR", "DECISION", `${c.symbol}: ${String(e)}`);
        }
      }
    } finally {
      this.scanning = false;
    }
  }
}

export function getEngine(): SofiaEngine {
  if (!g.__sofiaEngine) g.__sofiaEngine = new SofiaEngine();
  return g.__sofiaEngine;
}

export { DEFAULT_RISK_CONFIG };

