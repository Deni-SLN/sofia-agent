import { getStore } from "@/lib/core/store";
import { ok } from "@/lib/core/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const s = getStore();
  const url = new URL(req.url);
  const raw = parseInt(url.searchParams.get("limit") || "100", 10) || 100;
  const limit = Math.min(Math.max(raw, 1), 500);
  const level = url.searchParams.get("level");
  const events = level ? s.events.filter((e) => e.level === level.toUpperCase()) : s.events;
  return ok(events.slice(0, limit), { count: events.length });
}
