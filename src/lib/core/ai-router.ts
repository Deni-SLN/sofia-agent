// AI Router orchestrator: cache + budget + fallback (PRD 7.4).
import type { AiProviderConfig, AiTask } from "./ai-types";
import { budgetStatus, getCached, getRouterState, recordError, recordSuccess, recordUsage, setCached } from "./ai-store";
import { callAnthropic, callGemini, callOpenAiStyle } from "./ai-providers";
export interface AiChatResult {
  reply: string; providerId: string; model: string; cached: boolean;
  latencyMs: number; inTok: number; outTok: number; costUsd: number;
  fallbacksTried: string[];
}
export function configured(s = getRouterState()): AiProviderConfig[] {
  return s.providers.filter((p) => p.active && Boolean(process.env[p.apiKeyEnv]));
}
function costOf(p: AiProviderConfig, i: number, o: number): number {
  return Math.round(((i / 1000) * p.costPer1kInputUsd + (o / 1000) * p.costPer1kOutputUsd) * 1_000_000) / 1_000_000;
}
export async function aiChat(task: AiTask, system: string, user: string, o?: { timeoutMs?: number; maxFallbacks?: number }): Promise<AiChatResult> {
  const s = getRouterState();
  const timeoutMs = Math.min(Math.max(o?.timeoutMs ?? 20000, 3000), 60000);
  const hit = getCached(task, system, user);
  if (hit) {
    recordUsage(s, hit.providerId, 0, true);
    return { reply: hit.reply, providerId: hit.providerId, model: hit.model, cached: true, latencyMs: 0, inTok: hit.inTok, outTok: hit.outTok, costUsd: 0, fallbacksTried: [] };
  }
  const b = budgetStatus(s);
  if (b.blocked) throw new Error(b.reason || "Budget AI tercapai");
  const route = s.taskRoutes[task] || s.taskRoutes.chat;
  const byId = new Map(s.providers.map((p) => [p.id, p]));
  const ordered = route.map((id) => byId.get(id))
    .filter((p): p is AiProviderConfig => Boolean(p && p.active && process.env[p.apiKeyEnv]))
    .sort((a, z) => a.priority - z.priority)
    .slice(0, Math.max(1, Math.min(o?.maxFallbacks ?? 4, 8)));
  if (!ordered.length) throw new Error("NO_PROVIDER");
  const tried: string[] = [];
  let lastErr = "";
  for (const p of ordered) {
    const t0 = Date.now();
    try {
      const key = process.env[p.apiKeyEnv] as string;
      const base = { apiKey: key, model: p.model, maxTokens: p.maxTokens, system, user, timeoutMs };
      const res = p.id === "anthropic" ? await callAnthropic({ ...base, baseUrl: p.baseUrl })
        : p.id === "gemini" ? await callGemini({ ...base, baseUrl: p.baseUrl })
        : await callOpenAiStyle({ ...base, baseUrl: p.baseUrl, extraHeaders: p.id === "openrouter" ? { "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000", "X-Title": "SOFIA Trade" } : undefined });
      const lat = Date.now() - t0;
      const cost = costOf(p, res.inTok, res.outTok);
      recordSuccess(s, p.id, lat);
      recordUsage(s, p.id, cost, false);
      setCached(task, system, user, { reply: res.text, providerId: p.id, providerLabel: p.label, model: p.model, createdAt: Date.now(), inTok: res.inTok, outTok: res.outTok, costUsd: cost });
      return { reply: res.text, providerId: p.id, model: p.model, cached: false, latencyMs: lat, inTok: res.inTok, outTok: res.outTok, costUsd: cost, fallbacksTried: tried };
    } catch (e) {
      const lat = Date.now() - t0;
      lastErr = e instanceof Error ? e.message : String(e);
      recordError(s, p.id, lat, lastErr);
      tried.push(p.id);
    }
  }
  throw new Error(`Semua provider gagal (${tried.join(", ")}): ${lastErr}`);
}
export function routerStatus() {
  const s = getRouterState();
  const b = budgetStatus(s);
  return {
    providers: s.providers,
    configured: configured(s).map((p) => ({ id: p.id, label: p.label, model: p.model, active: p.active, apiKeyEnv: p.apiKeyEnv, baseUrl: p.baseUrl, costPer1kInputUsd: p.costPer1kInputUsd, costPer1kOutputUsd: p.costPer1kOutputUsd, maxTokens: p.maxTokens, priority: p.priority })),
    unconfigured: s.providers.filter((p) => p.active && !process.env[p.apiKeyEnv]).map((p) => ({ id: p.id, label: p.label, model: p.model, env: p.apiKeyEnv })),
    taskRoutes: s.taskRoutes,
    budget: { daily: s.budgetDailyUsd, monthly: s.budgetMonthlyUsd, usedDaily: s.usageToday.costUsd, usedMonthly: s.usageMonth.costUsd, dailyPct: Math.round(b.dailyPct * 10) / 10, monthlyPct: Math.round(b.monthlyPct * 10) / 10, blocked: b.blocked },
    usageToday: s.usageToday, usageMonth: s.usageMonth, health: s.health, cacheTtlMs: s.cacheTtlMs,
    cache: { size: 0, ttlMs: s.cacheTtlMs },
  };
}

// ---------- Parallel analysis (PRD 7.4) ----------

export interface AiParallelResponse {
  providerId: string;
  model: string;
  ok: boolean;
  text: string;
  error: string | null;
  latencyMs: number;
  costUsd: number;
  stance: "BULLISH" | "BEARISH" | "NETRAL";
}
export interface AiParallelResult {
  responses: AiParallelResponse[];
  consensus: { scorePct: number; stance: "BULLISH" | "BEARISH" | "NETRAL"; bullish: number; bearish: number; netral: number; total: number };
}

function stanceOf(text: string): "BULLISH" | "BEARISH" | "NETRAL" {
  const t = ` ${text.toLowerCase()} `;
  const bull = (t.match(/bullish|long|buy|naik|positif|potensi naik|uptrend/g) || []).length;
  const bear = (t.match(/bearish|short|sell|turun|negatif|potensi turun|downtrend/g) || []).length;
  if (bull > bear) return "BULLISH";
  if (bear > bull) return "BEARISH";
  return "NETRAL";
}

/** Analisa paralel ke N provider teratas sekaligus + skor konsensus. */
export async function aiParallel(task: AiTask, system: string, user: string, count = 3): Promise<AiParallelResult> {
  const s = getRouterState();
  const b = budgetStatus(s);
  if (b.blocked) throw new Error(b.reason || "Budget AI tercapai");
  const route = s.taskRoutes[task] || s.taskRoutes.chat;
  const byId = new Map(s.providers.map((p) => [p.id, p]));
  const picked = route
    .map((id) => byId.get(id))
    .filter((p): p is AiProviderConfig => Boolean(p && p.active && process.env[p.apiKeyEnv]))
    .sort((a, z) => a.priority - z.priority)
    .slice(0, Math.max(2, Math.min(count, 6)));
  if (!picked.length) throw new Error("NO_PROVIDER");

  const jobs = picked.map(async (p): Promise<AiParallelResponse> => {
    const t0 = Date.now();
    try {
      const key = process.env[p.apiKeyEnv] as string;
      const base = { apiKey: key, model: p.model, maxTokens: p.maxTokens, system, user, timeoutMs: 25000 };
      const res = p.id === "anthropic"
        ? await callAnthropic({ ...base, baseUrl: p.baseUrl })
        : p.id === "gemini"
          ? await callGemini({ ...base, baseUrl: p.baseUrl })
          : await callOpenAiStyle({ ...base, baseUrl: p.baseUrl, extraHeaders: p.id === "openrouter" ? { "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000", "X-Title": "SOFIA Trade" } : undefined });
      const lat = Date.now() - t0;
      const cost = costOf(p, res.inTok, res.outTok);
      recordSuccess(s, p.id, lat);
      recordUsage(s, p.id, cost, false);
      return { providerId: p.id, model: p.model, ok: true, text: res.text, error: null, latencyMs: lat, costUsd: cost, stance: stanceOf(res.text) };
    } catch (e) {
      const lat = Date.now() - t0;
      const msg = e instanceof Error ? e.message : String(e);
      recordError(s, p.id, lat, msg);
      return { providerId: p.id, model: p.model, ok: false, text: "", error: msg.slice(0, 200), latencyMs: lat, costUsd: 0, stance: "NETRAL" };
    }
  });

  const responses = await Promise.all(jobs);
  const okRes = responses.filter((r) => r.ok);
  const bull = okRes.filter((r) => r.stance === "BULLISH").length;
  const bear = okRes.filter((r) => r.stance === "BEARISH").length;
  const netral = okRes.filter((r) => r.stance === "NETRAL").length;
  const total = okRes.length;
  const majority = Math.max(bull, bear, netral);
  const stance = total === 0 ? "NETRAL" : majority === bull ? "BULLISH" : majority === bear ? "BEARISH" : "NETRAL";
  return {
    responses,
    consensus: { scorePct: total ? Math.round((majority / total) * 100) : 0, stance, bullish: bull, bearish: bear, netral, total },
  };
}
