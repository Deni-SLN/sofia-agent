// AI Router status API (PRD 7.4): GET status, POST save config, clear-cache.
import { ok, apiError, readJson } from "@/lib/core/api";
import { routerStatus } from "@/lib/core/ai-router";
import { clearCache, getRouterState } from "@/lib/core/ai-store";
import { telegramConfigured } from "@/lib/core/notify-telegram";

export const dynamic = "force-dynamic";

export async function GET() {
  const st = routerStatus();
  const size = await import("@/lib/core/ai-store").then((m) => m.cacheSize());
  return ok({ ...st, cache: { size, ttlMs: st.cacheTtlMs }, telegram: telegramConfigured() });
}

export async function POST(req: Request) {
  const b = await readJson<{ action?: string; config?: Record<string, unknown> }>(req);
  if (b.action === "clear-cache") return ok({ cleared: clearCache() });
  if (b.action === "save-config" && b.config) {
    try {
      const s = getRouterState();
      const cfg = b.config as {
        providers?: Array<{ id: string; active?: boolean; priority?: number }>;
        taskRoutes?: Record<string, string[]>;
        budgetDailyUsd?: number;
        budgetMonthlyUsd?: number;
        cacheTtlMs?: number;
      };
      const provById = new Map(s.providers.map((p) => [p.id, p]));
      if (Array.isArray(cfg.providers)) {
        for (const c of cfg.providers) {
          const p = provById.get(c.id);
          if (!p) continue;
          if (c.active !== undefined) p.active = Boolean(c.active);
          if (c.priority !== undefined) p.priority = Math.max(1, Math.min(99, Number(c.priority) || 1));
        }
      }
      if (cfg.taskRoutes && typeof cfg.taskRoutes === "object") {
        for (const [task, ids] of Object.entries(cfg.taskRoutes)) {
          if (Array.isArray(ids)) s.taskRoutes[task as keyof typeof s.taskRoutes] = ids;
        }
      }
      if (cfg.budgetDailyUsd !== undefined) s.budgetDailyUsd = Math.max(0, Number(cfg.budgetDailyUsd) || 0);
      if (cfg.budgetMonthlyUsd !== undefined) s.budgetMonthlyUsd = Math.max(0, Number(cfg.budgetMonthlyUsd) || 0);
      if (cfg.cacheTtlMs !== undefined) s.cacheTtlMs = Math.max(0, Number(cfg.cacheTtlMs) || 0);
      return ok({ saved: true, status: routerStatus() });
    } catch (e) {
      return apiError(e instanceof Error ? e.message : String(e), 400);
    }
  }
  return ok({ error: "action tidak dikenal (pakai clear-cache atau save-config)" });
}
