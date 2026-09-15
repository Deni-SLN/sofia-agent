// Dashboard — ringkasan live engine SOFIA.
"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wallet, TrendingUp, Brain, Activity, Play, Zap } from "lucide-react";
import { useEngineStatus, usePerformance } from "@/lib/hooks/use-engine";
import { formatUsd, formatPercent } from "@/lib/utils";

function StatCard({ title, value, sub, icon: Icon, iconColor }: {
  title: string; value: string; sub: string; icon: React.ElementType; iconColor: string;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-text-muted">{title}</p>
          <p className="text-2xl font-bold font-mono text-text-primary">{value}</p>
          <p className="text-xs text-text-muted">{sub}</p>
        </div>
        <div className={`p-3 rounded-card ${iconColor}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const { data, isLoading, error } = useEngineStatus(5000);
  const { data: perf } = usePerformance();
  const acct = data?.account;
  const h = data?.health;
  const dayPct = acct && acct.equity > 0 ? (acct.dailyPnl / acct.equity) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-sm text-text-muted">
            {h ? (<>
              SOFIA <Badge variant={h.state === "RUNNING" ? "success" : "default"}>{h.state}</Badge>{" "}
              <Badge variant={h.mode === "PAPER" ? "info" : "danger"}>{h.mode}</Badge>{" "}
              {h.halted && <Badge variant="danger">HALTED</Badge>} · Market via {h.marketSource}
            </>) : isLoading ? "Menghubungkan ke engine..." : "Engine tidak merespons"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/command-center"><Play className="mr-2 h-4 w-4" /> Command Center</Link>
          </Button>
          <Button asChild>
            <Link href="/trading/auto"><Zap className="mr-2 h-4 w-4" /> Auto Trading</Link>
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-danger/40 bg-danger/10">
          <CardContent className="py-3 text-sm text-danger">
            Gagal memuat status engine: {String(error)}. Pastikan dev server berjalan.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Equity (Paper)" value={acct ? formatUsd(acct.equity) : "—"}
          sub={acct ? `Balance ${formatUsd(acct.balanceUsd)}` : "—"}
          icon={Wallet} iconColor="bg-primary/20 text-primary" />
        <StatCard title="Daily P&L" value={acct ? formatUsd(acct.dailyPnl) : "—"}
          sub={acct ? `${formatPercent(dayPct)} hari ini` : "—"}
          icon={TrendingUp} iconColor="bg-success/20 text-success" />
        <StatCard title="Win Rate / Trades" value={perf ? `${perf.winRatePct}%` : "—"}
          sub={perf ? `${perf.tradeCount} closed · ${perf.wins}W/${perf.losses}L` : "Belum ada trade"}
          icon={Brain} iconColor="bg-info/20 text-info" />
        <StatCard title="Posisi Terbuka" value={data ? String(data.positions.length) : "—"}
          sub={data ? `${data.orders.length} order · ${data.signals.length} sinyal` : "—"}
          icon={Activity} iconColor="bg-warning/20 text-warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Posisi Terbuka</CardTitle>
            <CardDescription>Maks {data?.riskConfig.maxOpenPositions ?? 1} posisi · leverage 1x</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.positions || []).map((p) => (
              <div key={p.id} className="rounded-lg border border-border/60 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{p.symbol}</span>
                  <span className={`font-mono ${p.unrealizedPnl >= 0 ? "text-chart-up" : "text-chart-down"}`}>
                    {formatUsd(p.unrealizedPnl)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-text-muted">
                  {p.qty} @ {formatUsd(p.entryPrice)} → {formatUsd(p.currentPrice)}
                </p>
              </div>
            ))}
            {!data?.positions?.length && <p className="text-sm text-text-muted">Tidak ada posisi terbuka.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Kandidat Scanner</CardTitle>
            <CardDescription>Top hasil scan likuiditas + momentum</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.candidates || []).slice(0, 6).map((c) => (
              <div key={c.symbol} className="flex items-center justify-between text-sm">
                <span className="font-medium">{c.symbol}</span>
                <span className="text-text-muted">skor {c.score}</span>
                <Badge variant={c.signal === "LONG" ? "success" : "default"}>{c.signal}</Badge>
              </div>
            ))}
            {!data?.candidates?.length && <p className="text-sm text-text-muted">Belum ada hasil scan.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

