import { getStore } from "@/lib/core/store";
import { ok } from "@/lib/core/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const s = getStore();
  const url = new URL(req.url);
  const raw = parseInt(url.searchParams.get("limit") || "20", 10) || 20;
  const limit = Math.min(Math.max(raw, 1), 100);
  return ok(s.signals.slice(0, limit), { count: s.signals.length });
}
