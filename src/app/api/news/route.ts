// News Module API (PRD §7.11): GET /api/news?symbol=BTC&sentiment=POSITIF
import { ok, apiError } from "@/lib/core/api";
import { fetchNews } from "@/lib/core/news";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
export async function GET(req: Request) {
  const u = new URL(req.url);
  const symbol = String(u.searchParams.get("symbol") || "").toUpperCase().trim();
  const sentiment = String(u.searchParams.get("sentiment") || "").toUpperCase().trim();
  try {
    const { items, source, fetchedAt } = await fetchNews();
    let list = items;
    if (symbol) list = list.filter((n) => n.symbols.includes(symbol));
    if (sentiment === "POSITIF" || sentiment === "NETRAL" || sentiment === "NEGATIF")
      list = list.filter((n) => n.sentiment === sentiment);
    return ok({ items: list, source, fetchedAt }, { count: list.length, total: items.length });
  } catch (e) {
    return apiError(e instanceof Error ? e.message : String(e), 500);
  }
}