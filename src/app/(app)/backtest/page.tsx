// Backtest — uji strategi V1 di data historis Bybit (deterministik).
"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { formatUsd } from "@/lib/utils";

interface BTTrade { time: string; side: string; entry: number; exit: number; qty: number; pnl: number; exitReason: string }
interface BTResult {
  symbol: string; interval: string; candles: number;
  startingBalanceUsd: number; endingBalanceUsd: number;
  totalPnlUsd: number; returnPct: number;
  trades: BTTrade[]; wins: number; losses: number;
  winRatePct: number; maxDrawdownPct: number; profitFactor: number | null;
}

export default function BacktestPage() {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [interval, setInterval] = useState("60");
  const [limit, setLimit] = useState("500");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<BTResult | null>(null);

  async function run() {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/backtest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ symbol, interval, limit: Number(limit) }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      setRes(j.data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Backtest</h1>
        <p className="text-sm text-text-muted">
          Strategi V1: EMA20/EMA50 + RSI + ATR (SL 1.5x / TP 3x, fee 0.1%, slip 0.05%, maks 1 posisi).
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Konfigurasi</CardTitle>
          <CardDescription>Data kline live Bybit (fallback sintetis bila offline)</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs text-text-muted">Symbol</label>
            <Input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} className="w-40" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-text-muted">Interval</label>
            <Select value={interval} onValueChange={setInterval}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["15", "30", "60", "240", "D"] as const).map((i) => (
                  <SelectItem key={i} value={i}>{i === "D" ? "Daily" : `${i}m`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-text-muted">Candles (100-1000)</label>
            <Input value={limit} onChange={(e) => setLimit(e.target.value)} inputMode="numeric" className="w-32" />
          </div>
          <Button onClick={run} disabled={busy}>{busy ? "Menjalankan..." : "Jalankan Backtest"}</Button>
        </CardContent>
      </Card>
      {err && <p className="text-sm text-danger">{err}</p>}
      {res && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { l: "Return", v: `${res.returnPct >= 0 ? "+" : ""}${res.returnPct}% (${formatUsd(res.totalPnlUsd)})` },
              { l: "Trades", v: `${res.trades.length} (${res.wins}W/${res.losses}L)` },
              { l: "Win Rate", v: `${res.winRatePct}%` },
              { l: "Max Drawdown", v: `${res.maxDrawdownPct}%` },
              { l: "Profit Factor", v: res.profitFactor === null ? "—" : String(res.profitFactor) },
              { l: "Equity Akhir", v: formatUsd(res.endingBalanceUsd) },
              { l: "Candles", v: `${res.candles} x ${res.interval}` },
              { l: "Symbol", v: res.symbol },
            ].map((s) => (
              <Card key={s.l}>
                <CardContent className="pt-4">
                  <p className="text-xs text-text-muted">{s.l}</p>
                  <p className="font-mono font-bold">{s.v}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Trades ({res.trades.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {res.trades.slice(-30).reverse().map((t, i) => (
                <div key={i} className="flex items-center justify-between text-xs border border-border rounded-lg px-2 py-1.5">
                  <span className="font-mono">{t.entry.toFixed(4)} → {t.exit.toFixed(4)}</span>
                  <Badge variant={t.pnl > 0 ? "success" : "danger"}>{formatUsd(t.pnl)}</Badge>
                  <span className="text-text-muted">{t.exitReason}</span>
                </div>
              ))}
              {!res.trades.length && <p className="text-sm text-text-muted">Tidak ada trade (filter trend tidak memicu entry).</p>}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
