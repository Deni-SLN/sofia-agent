// Market Scanner — hasil scan live engine + refresh manual.
"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useCandidates, useTickers } from "@/lib/hooks/use-engine";
import { formatPercent } from "@/lib/utils";

export default function ScannerPage() {
  const { data: cands, isLoading, refetch, dataUpdatedAt } = useCandidates(15000);
  const { data: tickers } = useTickers(10, 15000);
  const [busy, setBusy] = useState(false);

  async function refreshNow() {
    setBusy(true);
    try {
      await fetch("/api/scanner?refresh=1", { cache: "no-store" });
      await refetch();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Market Scanner</h1>
          <p className="text-sm text-text-muted">
            Filter likuiditas ≥ $5M, spread ≤ 0.5%, skip panic &gt; 25%. Update{" "}
            {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString("id-ID") : "—"}.
          </p>
        </div>
        <Button variant="outline" onClick={refreshNow} disabled={busy}>
          <RefreshCw className="mr-2 h-4 w-4" /> {busy ? "Scanning..." : "Scan Sekarang"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kandidat ({cands?.length ?? 0})</CardTitle>
          <CardDescription>Diurutkan skor turnover + momentum</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {(cands || []).map((c, i) => (
            <div key={c.symbol} className="flex items-center gap-3 rounded-lg border border-border p-2 text-sm">
              <span className="w-8 font-mono text-text-muted">#{i + 1}</span>
              <div className="flex-1">
                <p className="font-semibold">{c.symbol}</p>
                <p className="text-xs text-text-muted">
                  24h <span className={c.price24hPct >= 0 ? "text-chart-up" : "text-chart-down"}>{formatPercent(c.price24hPct)}</span>
                  {" "}· Vol ${(c.turnover24h / 1e6).toFixed(1)}M
                </p>
              </div>
              <span className="text-xs text-text-muted">skor {c.score}</span>
              <Badge variant={c.signal === "LONG" ? "success" : c.signal === "WAIT" ? "warning" : "default"}>{c.signal}</Badge>
            </div>
          ))}
          {isLoading && <p className="text-sm text-text-muted">Memuat...</p>}
          {!isLoading && !cands?.length && <p className="text-sm text-text-muted">Tidak ada kandidat lolos filter.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Volume 24h</CardTitle>
          <CardDescription>Referensi likuiditas pasar spot USDT Bybit</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {(tickers || []).map((t) => (
            <div key={t.symbol} className="flex items-center justify-between text-sm">
              <span className="font-medium">{t.symbol}</span>
              <span className="font-mono">${t.lastPrice}</span>
              <span className={t.price24hPct >= 0 ? "text-chart-up" : "text-chart-down"}>{formatPercent(t.price24hPct)}</span>
              <span className="text-xs text-text-muted">${(t.turnover24h / 1e6).toFixed(0)}M</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
