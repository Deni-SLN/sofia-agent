// AI Router state: singleton, cache, budget, usage/health (PRD §42-49).
import type { AiCacheEntry, AiHealth, AiRouterState } from "./ai-types";
import { DEFAULT_PROVIDERS, DEFAULT_ROUTES } from "./ai-types";

const g = globalThis as unknown as Record<string, unknown>;
function todayKey(d = new Date()): string { return d.toISOString().slice(0, 10); }
function monthKey(d = new Date()): string { return d.toISOString().slice(0, 7) + "-01"; }
function blank(date: string) {
  return { date, costUsd: 0, requests: 0, cacheHits: 0, byProvider: {} as Record<string, { costUsd: number; requests: number; errors: number }> };
}
export function defaultRouterState(): AiRouterState {
  return {
    providers: DEFAULT_PROVIDERS.map((p) => ({ ...p })),
    taskRoutes: { chat: [...DEFAULT_ROUTES.chat], narrative: [...DEFAULT_ROUTES.narrative], analysis: [...DEFAULT_ROUTES.analysis], news: [...DEFAULT_ROUTES.news] },
    budgetDailyUsd: Number(process.env.AI_BUDGET_DAILY_USD || 1),
    budgetMonthlyUsd: Number(process.env.AI_BUDGET_MONTHLY_USD || 10),
    cacheTtlMs: Number(process.env.AI_CACHE_TTL_MS || 15 * 60_000),
    usageToday: blank(todayKey()),
    usageMonth: blank(monthKey()),
    health: {},
  };
}
export function getRouterState(): AiRouterState {
  const s = g.__sofiaAiRouter as AiRouterState | undefined;
  if (s && s.providers?.length) {
    if (s.usageToday.date !== todayKey()) s.usageToday = blank(todayKey());
    if (s.usageMonth.date !== monthKey()) s.usageMonth = blank(monthKey());
    return s;
  }
  const fresh = defaultRouterState();
  g.__sofiaAiRouter = fresh;
  return fresh;
}
function getCache(): Map<string, AiCacheEntry> {
  let c = g.__sofiaAiCache as Map<string, AiCacheEntry> | undefined;
  if (!c) { c = new Map<string, AiCacheEntry>(); g.__sofiaAiCache = c; }
  return c;
}
export function cacheSize(): number { return getCache().size; }
export function clearCache(): number { const n = getCache().size; getCache().clear(); return n; }
export function cacheKey(task: string, system: string, user: string): string {
  const norm = (x: string) => x.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 500);
  return `${task}::${norm(system)}::${norm(user)}`;
}
export function getCached(task: string, system: string, user: string): AiCacheEntry | null {
  const s = getRouterState();
  const k = cacheKey(task, system, user);
  const c = getCache().get(k);
  if (!c) return null;
  if (Date.now() - c.createdAt > s.cacheTtlMs) { getCache().delete(k); return null; }
  return c;
}
export function setCached(task: string, system: string, user: string, e: AiCacheEntry): void {
  const c = getCache();
  c.set(cacheKey(task, system, user), e);
  if (c.size > 500) { const f = c.keys().next().value as string | undefined; if (f) c.delete(f); }
}
export function budgetStatus(s: AiRouterState) {
  const dailyPct = s.budgetDailyUsd > 0 ? (s.usageToday.costUsd / s.budgetDailyUsd) * 100 : 0;
  const monthlyPct = s.budgetMonthlyUsd > 0 ? (s.usageMonth.costUsd / s.budgetMonthlyUsd) * 100 : 0;
  if (s.budgetDailyUsd > 0 && s.usageToday.costUsd >= s.budgetDailyUsd)
    return { dailyPct, monthlyPct, blocked: true as boolean, reason: `Budget harian tercapai ($${s.usageToday.costUsd.toFixed(4)} / $${s.budgetDailyUsd})` as string | null };
  if (s.budgetMonthlyUsd > 0 && s.usageMonth.costUsd >= s.budgetMonthlyUsd)
    return { dailyPct, monthlyPct, blocked: true as boolean, reason: `Budget bulanan tercapai ($${s.usageMonth.costUsd.toFixed(4)} / $${s.budgetMonthlyUsd})` as string | null };
  return { dailyPct, monthlyPct, blocked: false as boolean, reason: null as string | null };
}
export function recordUsage(s: AiRouterState, providerId: string, costUsd: number, cached: boolean): void {
  for (const u of [s.usageToday, s.usageMonth]) {
    u.requests += 1;
    if (cached) { u.cacheHits += 1; continue; }
    u.costUsd = Math.round((u.costUsd + costUsd) * 1_000_000) / 1_000_000;
    const b = u.byProvider[providerId] || { costUsd: 0, requests: 0, errors: 0 };
    b.costUsd = Math.round((b.costUsd + costUsd) * 1_000_000) / 1_000_000;
    b.requests += 1;
    u.byProvider[providerId] = b;
  }
}
export function recordError(s: AiRouterState, providerId: string, latencyMs: number, msg: string): void {
  const h: AiHealth = s.health[providerId] || { ok: false, latencyMs: null, errorRate: 0, lastCheckAt: null, lastError: null };
  const b = s.usageToday.byProvider[providerId] || { costUsd: 0, requests: 0, errors: 0 };
  b.errors += 1;
  s.usageToday.byProvider[providerId] = b;
  const total = b.requests + b.errors;
  h.ok = false; h.latencyMs = latencyMs;
  h.errorRate = total > 0 ? Math.round((b.errors / total) * 1000) / 10 : 100;
  h.lastCheckAt = new Date().toISOString(); h.lastError = msg.slice(0, 300);
  s.health[providerId] = h;
}
export function recordSuccess(s: AiRouterState, providerId: string, latencyMs: number): void {
  const h: AiHealth = s.health[providerId] || { ok: true, latencyMs: null, errorRate: 0, lastCheckAt: null, lastError: null };
  h.ok = true; h.latencyMs = latencyMs; h.lastCheckAt = new Date().toISOString(); h.lastError = null;
  const b = s.usageToday.byProvider[providerId];
  if (b) { const t = b.requests + b.errors; h.errorRate = t > 0 ? Math.round((b.errors / t) * 1000) / 10 : 0; }
  s.health[providerId] = h;
}
