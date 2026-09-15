import { getStore } from "@/lib/core/store";
import { getTickerFor } from "@/lib/core/market-data";
import { ok, apiError, readJson } from "@/lib/core/api";

export const dynamic = "force-dynamic";

function norm(sym: string): string {
  const u = sym.trim().toUpperCase();
  if (!u) return "";
  return u.endsWith("USDT") ? u : `${u}USDT`;
}

export async function GET() {
  const s = getStore();
  const mine = await Promise.all(
    s.watchlistMine.map(async (symbol) => {
      const t = await getTickerFor(symbol);
      return { symbol, ticker: t };
    })
  );
  const sofia = await Promise.all(
    s.watchlistSofia.map(async (symbol) => {
      const t = await getTickerFor(symbol);
      return { symbol, ticker: t };
    })
  );
  return ok({ mine, sofia: sofia });
}

export async function POST(req: Request) {
  const s = getStore();
  const body = await readJson<{ list?: string; symbol?: string; action?: string }>(req);
  const list = String(body.list || "mine").toLowerCase();
  const symbol = norm(String(body.symbol || ""));
  const action = String(body.action || "add").toLowerCase();
  if (list !== "mine" && list !== "sofia") return apiError("list harus mine/sofia", 400);
  if (!symbol) return apiError("symbol wajib", 400);
  const target = list === "mine" ? s.watchlistMine : s.watchlistSofia;
  if (action === "add") {
    if (!target.includes(symbol)) target.push(symbol);
  } else if (action === "remove") {
    const i = target.indexOf(symbol);
    if (i >= 0) target.splice(i, 1);
  } else {
    return apiError("action harus add/remove", 400);
  }
  return ok({ list, watchlist: target });
}
