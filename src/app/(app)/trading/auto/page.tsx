// Auto Trading — status loop otonom + kandidat + sinyal terakhir.
"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEngineStatus } from "@/lib/hooks/use-engine";
import { formatUsd, formatDate } from "@/lib/utils";

export default function AutoTradingPage() {
  const { data } = useEngineStatus(5000);
  const h = data?.health;
  const cands = data?.candidates || [];
  const signals = data?.signals || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Auto Trading</h1>
          <p className="text-sm text-text-muted">
            Loop otonom: scan → analisis → risk → eksekusi → monitor. Min confidence{" "}
            {data?.riskConfig.autoTradeMinConfidence ?? 80}.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/command-center">Kelola di Command Center</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Status Loop
            <Badge variant={h?.state === "RUNNING" ? "success" : "default"}>{h?.state || "—"}</Badge>
            {h?.halted && <Badge variant="danger">HALTED: {h.haltedReason}</Badge>}
          </CardTitle>
          <CardDescription>
            Siklus {h?.cycles ?? 0} · error {h?.errors ?? 0} · scan terakhir{" "}
            {h?.lastScanAt ? formatDate(h.lastScanAt) : "belum pernah"}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Kandidat Scanner ({cands.length})</CardTitle>
            <CardDescription>Top hasil scan likuiditas + momentum</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {cands.slice(0, 10).map((c) => (
              <div key={c.symbol} className="flex items-center justify-between rounded-lg border border-border p-2 text-sm">
                <div>
                  <p className="font-semibold">{c.symbol}</p>
                  <p className="text-xs text-text-muted">
                    24h {c.price24hPct >= 0 ? "+" : ""}{c.price24hPct.toFixed(2)}% · Vol ${(c.turnover24h / 1e6).toFixed(1)}M
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted">skor {c.score}</span>
                  <Badge variant={c.signal === "LONG" ? "success" : "default"}>{c.signal}</Badge>
                </div>
              </div>
            ))}
            {!cands.length && <p className="text-sm text-text-muted">Belum ada hasil scan. Jalankan engine dari Command Center.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Sinyal Terakhir ({signals.length})</CardTitle>
            <CardDescription>Keputusan Decision Agent + status risk/execution</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {signals.slice(0, 10).map((s) => (
              <div key={s.id} className="rounded-lg border border-border p-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{s.symbol}</span>
                  <Badge variant={s.action === "LONG" ? "success" : s.action === "WAIT" ? "warning" : "default"}>
                    {s.action} {s.confidence}
                  </Badge>
                  <Badge variant="info">{s.state}</Badge>
                  <span className="ml-auto text-xs text-text-muted">{formatDate(s.createdAt)}</span>
                </div>
                <p className="mt-1 text-xs text-text-muted">
                  {s.strategy} · entry {formatUsd(s.entry)} · SL {formatUsd(s.stopLoss)} · TP {formatUsd(s.takeProfit)}
                </p>
              </div>
            ))}
            {!signals.length && <p className="text-sm text-text-muted">Belum ada sinyal.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
