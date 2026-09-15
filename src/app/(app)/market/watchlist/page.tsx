// Watchlist — daftar Mine vs SOFIA dengan harga live.
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatPercent } from "@/lib/utils";

interface Row { symbol: string; ticker: { lastPrice: number; price24hPct: number } | null }
interface WL { mine: Row[]; sofia: Row[] }

async function load(): Promise<WL> {
  const r = await fetch("/api/watchlist", { cache: "no-store" });
  const j = await r.json();
  if (!j.ok) throw new Error(j.error);
  return j.data;
}

export default function WatchlistPage() {
  const { data, refetch, isLoading } = useQuery({ queryKey: ["watchlist"], queryFn: load, refetchInterval: 10000 });
  const [sym, setSym] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function add(list: "mine" | "sofia") {
    setMsg(null);
    try {
      const r = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ list, symbol: sym, action: "add" }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      setSym("");
      await refetch();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  }

  async function remove(list: "mine" | "sofia", symbol: string) {
    const r = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ list, symbol, action: "remove" }),
    });
    await r.json();
    await refetch();
  }

  function list(name: string, rows: Row[] | undefined, listKey: "mine" | "sofia") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{name} ({rows?.length ?? 0})</CardTitle>
          <CardDescription>{listKey === "mine" ? "Pantau manual Anda" : "Pantau pilihan SOFIA"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {(rows || []).map((w) => (
            <div key={w.symbol} className="flex items-center justify-between rounded-lg border border-border p-2 text-sm">
              <div>
                <p className="font-semibold">{w.symbol}</p>
                <p className="text-xs text-text-muted font-mono">
                  {w.ticker ? `$${w.ticker.lastPrice}` : "—"} ·{" "}
                  <span className={(w.ticker?.price24hPct ?? 0) >= 0 ? "text-chart-up" : "text-chart-down"}>
                    {w.ticker ? formatPercent(w.ticker.price24hPct) : "—"}
                  </span>
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => remove(listKey, w.symbol)}>Hapus</Button>
            </div>
          ))}
          {!rows?.length && <p className="text-sm text-text-muted">{isLoading ? "Memuat..." : "Kosong."}</p>}
          <div className="flex gap-2 pt-2">
            <Badge variant="default">{listKey === "mine" ? "Mine" : "SOFIA"}</Badge>
            <Button size="sm" variant="outline" onClick={() => add(listKey)}>+ Tambah</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Watchlist</h1>
      <div className="flex gap-2">
        <Input placeholder="cth: BTC atau BTCUSDT" value={sym} onChange={(e) => setSym(e.target.value)} className="max-w-xs" />
      </div>
      {msg && <p className="text-sm text-danger">{msg}</p>}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {list("My Watchlist", data?.mine, "mine")}
        {list("SOFIA Watchlist", data?.sofia, "sofia")}
      </div>
    </div>
  );
}
