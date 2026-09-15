// ============================================================
// SOFIA Trade — Core Domain Types
// Aligned with PRD SOFIA Trade V1 (sections 12, 26, 45, 46, 53)
// ============================================================

export type TradingMode = "PAPER" | "LIVE";
export type EngineState = "STOPPED" | "STARTING" | "RUNNING" | "STOPPING" | "HALTED";
export type OrderSide = "BUY" | "SELL";
export type PositionSide = "LONG" | "SHORT";
export type OrderType = "MARKET" | "LIMIT";
export type OrderStatus =
  | "PENDING"
  | "OPEN"
  | "PARTIALLY_FILLED"
  | "FILLED"
  | "CANCELLED"
  | "EXPIRED"
  | "REJECTED";
export type PositionStatus = "OPEN" | "CLOSED";
export type SignalAction = "LONG" | "SHORT" | "WAIT" | "NO_TRADE";
export type MarketRegime =
  | "BULL_TREND"
  | "BEAR_TREND"
  | "SIDEWAYS"
  | "HIGH_VOLATILITY"
  | "LOW_VOLATILITY"
  | "PANIC"
  | "EUPHORIA";
export type TradeState =
  | "CANDIDATE"
  | "ANALYZING"
  | "SIGNAL_CREATED"
  | "RISK_VALIDATION"
  | "REJECTED"
  | "APPROVED"
  | "ORDER_PENDING"
  | "FILLED"
  | "POSITION_OPEN"
  | "CLOSED"
  | "JOURNALED"
  | "PERFORMANCE";
export type TradeResult = "WIN" | "LOSS" | "BREAKEVEN" | "OPEN";
export type EventLevel = "INFO" | "WARN" | "ERROR";
export type DataSource = "BYBIT" | "FALLBACK" | "UNKNOWN";

// ---- Notifications (PRD §7.16) ----

export type NotificationType = "TRADE" | "SIGNAL" | "RISK" | "SYSTEM";
export interface AppNotification {
  id: string;
  ts: string;
  type: NotificationType;
  level: EventLevel;
  title: string;
  body: string;
  read: boolean;
}

// ---- Risk (PRD §26 — deterministic, never LLM) ----

export interface RiskConfig {
  riskPerTradePct: number;
  maxDailyLossPct: number;
  maxOpenPositions: number;
  maxConsecutiveLosses: number;
  minRiskReward: number;
  maxPositionPct: number;
  leverage: number;
  minOrderUsd: number;
  minOrderQty: number;
  takerFeePct: number;
  slippagePct: number;
  maxSpreadPct: number;
  minTurnoverUsd: number;
  autoTradeMinConfidence: number;
  trailingStopPct: number;
  scanIntervalMs: number;
  cycleIntervalMs: number;
}

export interface RiskCheck {
  name: string;
  passed: boolean;
  detail: string;
}

export interface TradeSizing {
  qty: number;
  riskUsd: number;
  notionalUsd: number;
  feeEstUsd: number;
  leverage: number;
}

export interface RiskValidation {
  approved: boolean;
  reasons: string[];
  checks: RiskCheck[];
  sizing: TradeSizing;
  validatedAt: string;
}

// ---- Decision / Signal (PRD §12.8, §53, §55) ----

export interface ScoreBreakdown {
  technical: number;
  momentum: number;
  orderFlow: number;
  regime: number;
  news: number;
  strategyFit: number;
  riskReward: number;
  liquidity: number;
}

export interface TradeSignal {
  id: string;
  symbol: string;
  action: SignalAction;
  confidence: number;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  riskReward: number;
  strategy: string;
  marketRegime: MarketRegime;
  invalidation: string;
  scores: ScoreBreakdown;
  reasons: string[];
  state: TradeState;
  mode: TradingMode;
  createdAt: string;
}

// ---- Market data ----

export interface Ticker {
  symbol: string;
  lastPrice: number;
  price24hPct: number;
  volume24h: number;
  turnover24h: number;
  bid: number;
  ask: number;
  source: DataSource;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketCandidate {
  symbol: string;
  score: number;
  signal: SignalAction;
  price24hPct: number;
  turnover24h: number;
  ticker: Ticker;
}

// ---- Paper trading (PRD §24) ----

export interface PaperAccount {
  id: string;
  balanceUsd: number;
  startingBalanceUsd: number;
  startingBalanceIdr: number;
  realizedPnl: number;
  feesPaid: number;
  dayDate: string;
  dayStartEquity: number;
  dailyPnl: number;
  consecutiveLosses: number;
  maxEquityUsd: number;
  createdAt: string;
}

export interface PaperOrder {
  id: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  qty: number;
  price: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  status: OrderStatus;
  filledQty: number;
  avgFillPrice: number | null;
  feeUsd: number;
  slippageUsd: number;
  signalId: string | null;
  reason: string;
  createdAt: string;
  filledAt: string | null;
}

export interface PaperPosition {
  id: string;
  symbol: string;
  side: PositionSide;
  qty: number;
  entryPrice: number;
  currentPrice: number;
  takeProfit: number | null;
  stopLoss: number | null;
  trailingStopPct: number | null;
  trailingStopPrice: number | null;
  peakPrice: number;
  unrealizedPnl: number;
  realizedPnl: number | null;
  feeUsd: number;
  signalId: string | null;
  strategy: string;
  marketRegime: MarketRegime;
  status: PositionStatus;
  openedAt: string;
  closedAt: string | null;
  closePrice: number | null;
  closeReason: string | null;
}

// ---- Journal & performance (PRD §35, §36) ----

export interface JournalEntry {
  id: string;
  tradeId: string | null;
  symbol: string;
  mode: TradingMode;
  strategy: string;
  marketRegime: MarketRegime;
  scores: ScoreBreakdown | null;
  entry: number;
  stopLoss: number | null;
  takeProfit: number | null;
  qty: number;
  riskUsd: number;
  feeUsd: number;
  slippageUsd: number;
  reasoning: string;
  evidence: string[];
  result: TradeResult;
  pnl: number | null;
  pnlPct: number | null;
  durationMs: number | null;
  confidence: number;
  createdAt: string;
  closedAt: string | null;
}

export interface PerformanceSummary {
  tradeCount: number;
  wins: number;
  losses: number;
  winRatePct: number;
  grossProfitUsd: number;
  grossLossUsd: number;
  profitFactor: number | null;
  expectancyUsd: number;
  avgWinUsd: number;
  avgLossUsd: number;
  totalPnlUsd: number;
  maxDrawdownPct: number;
  bestTradeUsd: number;
  worstTradeUsd: number;
  bySymbol: Array<{ symbol: string; trades: number; pnl: number; winRatePct: number }>;
  equityCurve: Array<{ t: string; cumulative: number }>;
}

// ---- System ----

export interface SystemEvent {
  id: string;
  ts: string;
  level: EventLevel;
  source: string;
  message: string;
}

export interface AgentStatus {
  name: string;
  role: string;
  status: "ONLINE" | "IDLE" | "OFFLINE" | "ERROR";
  runs: number;
  errors: number;
  lastRunAt: string | null;
  lastLatencyMs: number | null;
  lastTask: string | null;
}

export interface EngineHealth {
  state: EngineState;
  mode: TradingMode;
  halted: boolean;
  haltedReason: string | null;
  startedAt: string | null;
  uptimeMs: number;
  cycles: number;
  errors: number;
  marketSource: DataSource;
  lastTickersAt: string | null;
  lastScanAt: string | null;
  liveUnlocked: boolean;
}

export interface CurrencyState {
  usdIdr: number;
  source: "API" | "FALLBACK";
  fetchedAt: string;
}

