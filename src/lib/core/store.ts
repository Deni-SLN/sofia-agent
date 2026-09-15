// ============================================================
// SOFIA Trade — Runtime store (singleton per proses server)
// In-memory untuk V1 (persistensi Supabase menyusul di Fase 6).
// globalThis dipakai agar survive Next.js dev HMR.
// ============================================================

import type {
  AgentStatus,
  AppNotification,
  DataSource,
  EngineState,
  EventLevel,
  JournalEntry,
  MarketCandidate,
  NotificationType,
  RiskConfig,
  SystemEvent,
  TradeSignal,
  TradingMode,
} from "./types";
import type { SavedStrategy } from "./strategies";
import type { SavedPrompt } from "./prompts";
import type { PaperAccount, PaperOrder, PaperPosition } from "./types";
import { DEFAULT_RISK_CONFIG } from "./risk-engine";
import { newAccount } from "./paper-engine";
import { getUsdIdrSync } from "./currency";

export interface SofiaStore {
  engineState: EngineState;
  mode: TradingMode;
  startedAt: string | null;
  halted: boolean;
  haltedReason: string | null;
  account: PaperAccount;
  orders: PaperOrder[];
  positions: PaperPosition[];
  journal: JournalEntry[];
  signals: TradeSignal[];
  events: SystemEvent[];
  candidates: MarketCandidate[];
  lastScanAt: string | null;
  riskConfig: RiskConfig;
  watchlistMine: string[];
  watchlistSofia: string[];
  marketSource: DataSource;
  lastTickersAt: string | null;
  liveUnlocked: boolean;
  livePinHash: string | null;
  agents: AgentStatus[];
  stats: { cycles: number; errors: number };
  notifications: AppNotification[];
  strategies: SavedStrategy[];
  prompts: SavedPrompt[];
}

const DEFAULT_AGENTS: Array<{ name: string; role: string }> = [
  { name: "Scanner", role: "Market Scanner" },
  { name: "Technical", role: "Technical Analysis" },
  { name: "Momentum", role: "Momentum Analysis" },
  { name: "Order Flow", role: "Order Flow Analysis" },
  { name: "Regime", role: "Regime Detection" },
  { name: "News", role: "News Intelligence" },
  { name: "Strategy", role: "Strategy Selection" },
  { name: "Decision", role: "Decision Agent" },
  { name: "Risk Engine", role: "Pre-trade Risk Control" },
  { name: "Execution Engine", role: "Paper Execution" },
  { name: "Position Monitor", role: "TP/SL/Trailing" },
  { name: "Journal", role: "Trade Journal" },
  { name: "Performance", role: "Performance Analytics" },
];

export const STARTING_BALANCE_IDR = 100_000; // PRD §1: modal virtual Rp100.000

function initStore(): SofiaStore {
  const rate = getUsdIdrSync().usdIdr;
  return {
    engineState: "STOPPED",
    mode: "PAPER",
    startedAt: null,
    halted: false,
    haltedReason: null,
    account: newAccount(STARTING_BALANCE_IDR, rate),
    orders: [],
    positions: [],
    journal: [],
    signals: [],
    events: [],
    candidates: [],
    lastScanAt: null,
    riskConfig: { ...DEFAULT_RISK_CONFIG },
    watchlistMine: [],
    watchlistSofia: ["BTCUSDT", "ETHUSDT", "SOLUSDT"],
    marketSource: "UNKNOWN",
    lastTickersAt: null,
    liveUnlocked: false,
    livePinHash: null,
    agents: DEFAULT_AGENTS.map((a) => ({
      ...a,
      status: "OFFLINE" as const,
      runs: 0,
      errors: 0,
      lastRunAt: null,
      lastLatencyMs: null,
      lastTask: null,
    })),
    stats: { cycles: 0, errors: 0 },
    notifications: [],
    strategies: [],
    prompts: [],
  };
}

const g = globalThis as unknown as { __sofiaStore?: SofiaStore };

export function getStore(): SofiaStore {
  if (!g.__sofiaStore) {
    g.__sofiaStore = initStore();
    // Restore snapshot Supabase sekali saat boot (best-effort, async).
    void restoreFromSnapshot();
  }
  return g.__sofiaStore;
}

let restoreAttempted = false;

/** Restore snapshot Supabase ke store (sekali per proses server). */
async function restoreFromSnapshot(): Promise<void> {
  if (restoreAttempted) return;
  restoreAttempted = true;
  try {
    const { loadSnapshot } = await import("./persistence");
    const s = g.__sofiaStore;
    if (!s) return;
    const ok = await loadSnapshot(s);
    if (ok) {
      s.events.unshift({
        id: `ev-${Date.now()}-restore`,
        ts: new Date().toISOString(),
        level: "INFO",
        source: "STORE",
        message: "Snapshot Supabase dipulihkan (engine boot STOPPED, aman).",
      });
    }
  } catch {
    // best-effort: abaikan
  }
}

/** Persist snapshot Supabase (debounced, best-effort). */
export function persist(): void {
  try {
    const s = g.__sofiaStore;
    if (!s) return;
    void import("./persistence").then((m) => m.saveSnapshotDebounced(s));
  } catch {
    // abaikan
  }
}

let eventSeq = 0;

export function pushEvent(level: EventLevel, source: string, message: string): SystemEvent {
  const s = getStore();
  eventSeq += 1;
  const ev: SystemEvent = {
    id: `ev-${Date.now()}-${eventSeq}`,
    ts: new Date().toISOString(),
    level,
    source,
    message,
  };
  s.events.unshift(ev);
  if (s.events.length > 500) s.events.length = 500;
  persist();
  return ev;
}

let notifSeq = 0;

/** Notifikasi untuk UI bell + browser push (PRD §7.16). */
export function pushNotification(type: NotificationType, level: EventLevel, title: string, body: string): AppNotification {
  const s = getStore();
  notifSeq += 1;
  const n: AppNotification = {
    id: `nt-${Date.now()}-${notifSeq}`,
    ts: new Date().toISOString(),
    type,
    level,
    title,
    body,
    read: false,
  };
  s.notifications.unshift(n);
  if (s.notifications.length > 200) s.notifications.length = 200;
  persist();
  // Teruskan ke Telegram bila env diset (fire-and-forget, PRD §7.16).
  try {
    void import("./notify-telegram").then((m) => m.sendTelegram(title, body));
  } catch {
    // abaikan
  }
  return n;
}

/** Mark notification(s) as read; tiddak semua jika ids kosong. */
export function markNotificationsRead(ids?: string[]): number {
  const s = getStore();
  let n = 0;
  for (const x of s.notifications) {
    if (x.read) continue;
    if (!ids || ids.length === 0 || ids.includes(x.id)) {
      x.read = true;
      n += 1;
    }
  }
  if (n) persist();
  return n;
}

export function unreadNotifications(): AppNotification[] {
  return getStore().notifications.filter((n) => !n.read);
}

export function addStrategy(s: SavedStrategy): void {
  const st = getStore();
  st.strategies.unshift(s);
  if (st.strategies.length > 100) st.strategies.length = 100;
  persist();
}
export function removeStrategy(id: string): boolean {
  const st = getStore();
  const before = st.strategies.length;
  st.strategies = st.strategies.filter((x) => x.id !== id);
  if (st.strategies.length !== before) {
    persist();
    return true;
  }
  return false;
}

export function upsertPrompt(p: SavedPrompt): void {
  const st = getStore();
  const i = st.prompts.findIndex((x) => x.id === p.id);
  if (i >= 0) st.prompts[i] = p;
  else st.prompts.unshift(p);
  if (st.prompts.length > 100) st.prompts.length = 100;
  persist();
}
export function removePrompt(id: string): boolean {
  const st = getStore();
  const before = st.prompts.length;
  st.prompts = st.prompts.filter((x) => x.id !== id);
  if (st.prompts.length !== before) {
    persist();
    return true;
  }
  return false;
}

export function updateAgent(name: string, patch: Partial<AgentStatus>): void {
  const s = getStore();
  const a = s.agents.find((x) => x.name === name);
  if (a) Object.assign(a, patch);
}

export function touchAgent(name: string, task: string, latencyMs: number): void {
  const s = getStore();
  const a = s.agents.find((x) => x.name === name);
  if (!a) return;
  a.status = "ONLINE";
  a.runs += 1;
  a.lastRunAt = new Date().toISOString();
  a.lastTask = task;
  a.lastLatencyMs = latencyMs;
}

export function agentError(name: string, task: string): void {
  const s = getStore();
  const a = s.agents.find((x) => x.name === name);
  if (!a) return;
  a.status = "ERROR";
  a.errors += 1;
  a.lastRunAt = new Date().toISOString();
  a.lastTask = task;
}

export function recordSignal(sig: TradeSignal): void {
  const s = getStore();
  s.signals.unshift(sig);
  if (s.signals.length > 100) s.signals.length = 100;
  persist();
}

export function addJournal(entry: JournalEntry): void {
  const s = getStore();
  s.journal.unshift(entry);
  if (s.journal.length > 1000) s.journal.length = 1000;
  try {
    void import("./persistence").then((m) => {
      m.archiveJournal(entry);
      m.saveSnapshotDebounced(s);
    });
  } catch {
    // abaikan
  }
}

export function closeJournalTrade(tradeId: string, patch: Partial<JournalEntry>): JournalEntry | null {
  const s = getStore();
  const j = s.journal.find((x) => x.tradeId === tradeId && x.result === "OPEN");
  if (!j) return null;
  Object.assign(j, patch);
  try {
    void import("./persistence").then((m) => {
      m.archiveJournal(j);
      m.saveSnapshotDebounced(s);
    });
  } catch {
    // abaikan
  }
  return j;
}

export function resetStore(): SofiaStore {
  g.__sofiaStore = initStore();
  return g.__sofiaStore;
}
