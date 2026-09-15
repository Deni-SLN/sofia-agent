// Market News (PRD §7.11) — agregasi RSS + sentiment + filter simbol.
"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import type { NewsItem, NewsSentiment } from "@/lib/core/news";

const SENT_VARIANT: Record<NewsSentiment, "success" | "warning" | "danger"> = {
  POSITIF: "success",
  NETRAL: "warning",
  NEGATIF: "danger",
};

export default function MarketNewsPage() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [source, setSource] = useState<"LIVE" | "FALLBACK">("FALLBACK");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [sym, setSym] = useState("");
  const [sent, setSent] = useState<"ALL" | NewsSentiment>("ALL");

  async function load(symbol = sym, senti: "ALL" | NewsSentiment = sent) {
    const q = new URLSearchParams();
    if (symbol) q.set("symbol", symbol);
    if (senti !== "ALL") q.set("sentiment", senti);
    setLoading(true);
    try {
      const r = await fetch(`/api/news?${q.toString()}`);
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      setItems(j.data.items);
      setSource(String(j.data.source) === "LIVE" ? "LIVE" : "FALLBACK");
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load("", "ALL");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">News</h1>
          <p className="text-sm text-text-muted">
            Agregasi RSS publik (CoinDesk, Cointelegraph, Bitcoin Magazine) · sentiment heuristic automatik
            <Badge variant={source === "LIVE" ? "success" : "warning"} className="ml-1">{source === "LIVE" ? "LIVE" : "FALLBACK"}</Badge>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={sym}
            onChange={(e) => { const v = e.target.value.toUpperCase(); setSym(v); void load(v, sent); }}
            placeholder="Filter simbol (mis. BTC)"
            className="h-9 w-36"
          />
          <select
            value={sent}
            onChange={(e) => { const v = e.target.value as "ALL" | NewsSentiment; setSent(v); void load(sym, v); }}
            className="h-9 rounded-btn border border-border bg-background px-3 text-sm text-text-primary"
          >
            <option value="ALL">Sentiment: Semua</option>
            <option value="POSITIF">Positif</option>
            <option value="NETRAL">Netral</option>
            <option value="NEGATIF">Negatif</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        {loading && <p className="text-sm text-text-muted">Memuat news...</p>}
        {err && <p className="text-sm text-danger">{err}</p>}
        {!loading && !items.length && <p className="text-sm text-text-muted">Belum ada news sepasal filter.</p>}
        {items.slice(0, 40).map((n) => (
          <Card key={n.id} className="!py-2">
            <CardTitle className="text-sm">
              <a href={n.url} target="_blank" rel="noreferrer" className="text-text-secondary hover:text-text-primary hover:underline">
                {n.title}
              </a>
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={SENT_VARIANT[n.sentiment]}>{n.sentiment}</Badge>
              {n.symbols.map((s) => <Badge key={s} variant="info">{s}</Badge>)}
              <span className="text-xs text-text-muted">{n.source} · {n.publishedAt ? formatDate(n.publishedAt) : "—"}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}