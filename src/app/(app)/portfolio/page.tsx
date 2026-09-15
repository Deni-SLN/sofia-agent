// Portfolio — equity/balance live + aset + performa closed trades + equity curve chart.
"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEngineStatus, usePerformance } from "@/lib/hooks/use-engine";
import { formatUsd, formatIdrFromUsd, formatPercent } from "@/lib/utils";

function EquityCurve({ data }: { data: Array<{ t: string; cumulative: number }> }): JSX.Element {
  if (!data || data.length < 2) {
    return <p className="text-sm text-text-muted py-8 text-center">Belum cukup data untuk equity curve.</p>;
  }
  const w = 600;
  const h = 200;
  const pad = 30;
  const xs = data.map(function (d) { return d.cumulative; });
  const minX = Math.min.apply(null, xs);
  const maxX = Math.max.apply(null, xs);
  const rangeX = maxX - minX || 1;
  const xStep = (w - pad * 2) / (data.length - 1);
  const yScale = function (v: number) { return h - pad - ((v - minX) / rangeX) * (h - pad * 2); };
  const points = data.map(function (d, i) { return { x: pad + i * xStep, y: yScale(d.cumulative) }; });
  const path = points.map(function (p, i) { return (i === 0 ? "M" : "L") + p.x.toFixed(1) + "," + p.y.toFixed(1); }).join(" ");
  const lastY = points[points.length - 1] ? points[points.length - 1].y : 0;
  const color = data[data.length - 1].cumulative >= data[0].cumulative ? "#22c55e" : "#ef4444";
  return React.createElement("svg", { className: "w-full h-48", preserveAspectRatio: "xMidYMid meet" },
    React.createElement("line", { x1: pad, y1: h - pad, x2: w - pad, y2: h - pad, stroke: "#334155", strokeWidth: 1 }),
    React.createElement("line", { x1: pad, y1: pad, x2: pad, y2: h - pad, stroke: "#334155", strokeWidth: 1 }),
    React.createElement("path", { d: path, fill: "none", stroke: color, strokeWidth: 2 }),
    React.createElement("circle", { cx: points[points.length - 1].x, cy: lastY, r: 3, fill: color }),
    React.createElement("text", { x: pad, y: h - 8, fill: "#94a3b8", fontSize: 9 }, formatUsd(minX)),
    React.createElement("text", { x: pad, y: pad - 4, fill: "#94a3b8", fontSize: 9 }, formatUsd(maxX))
  );
}


export default function PortfolioPage() {
  const { data } = useEngineStatus(5000);
  const { data: perf } = usePerformance();
  const acct = data?.account;
  const rate = data?.currency.usdIdr ?? 16000;
  const pf = perf;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Portfolio</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="space-y-1 pt-4">
            <p className="text-sm text-text-muted">Equity</p>
            <p className="text-2xl font-bold font-mono">{acct ? formatUsd(acct.equity) : "—"}</p>
            <p className="text-xs text-text-muted">{acct ? formatIdrFromUsd(acct.equity, rate) : ""}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 pt-4">
            <p className="text-sm text-text-muted">Balance (cash)</p>
            <p className="text-2xl font-bold font-mono">{acct ? formatUsd(acct.balanceUsd) : "—"}</p>
            <p className="text-xs text-text-muted">Unrealized {acct ? formatUsd(acct.unrealizedPnl) : "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 pt-4">
            <p className="text-sm text-text-muted">Realized P&amp;L</p>
            <p className={`text-2xl font-bold font-mono ${(acct?.realizedPnl ?? 0) >= 0 ? "text-chart-up" : "text-chart-down"}`}>
              {acct ? formatUsd(acct.realizedPnl) : "—"}
            </p>
            <p className="text-xs text-text-muted">Fee dibayar {acct ? formatUsd(acct.feesPaid) : "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 pt-4">
            <p className="text-sm text-text-muted">Win Rate</p>
            <p className="text-2xl font-bold font-mono">{pf ? `${pf.winRatePct}%` : "—"}</p>
            <p className="text-xs text-text-muted">{pf ? `${pf.tradeCount} closed · PF ${pf.profitFactor ?? "—"}` : "Belum ada trade"}</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Equity Curve</CardTitle>
          <CardDescription>Kumulatif PnL dari jurnal (deterministik)</CardDescription>
        </CardHeader>
        <CardContent>
          <EquityCurve data={pf?.equityCurve ?? []} />
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Posisi Terbuka ({data?.positions.length ?? 0})</CardTitle>
            <CardDescription>Long-only V1 · leverage 1x</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.positions || []).map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-border p-2 text-sm">
                <div>
                  <p className="font-semibold">{p.symbol}</p>
                  <p className="text-xs text-text-muted font-mono">{p.qty} @ {formatUsd(p.entryPrice)} → {formatUsd(p.currentPrice)}</p>
                </div>
                <span className={`font-mono ${p.unrealizedPnl >= 0 ? "text-chart-up" : "text-chart-down"}`}>
                  {formatUsd(p.unrealizedPnl)}
                </span>
              </div>
            ))}
            {!data?.positions?.length && <p className="text-sm text-text-muted">Tidak ada posisi terbuka.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ringkasan Performa</CardTitle>
            <CardDescription>Dihitung deterministik dari jurnal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {pf ? (
              <>
                <div className="flex justify-between"><span>Total P&amp;L</span><span className="font-mono">{formatUsd(pf.totalPnlUsd)}</span></div>
                <div className="flex justify-between"><span>Expectancy/trade</span><span className="font-mono">{formatUsd(pf.expectancyUsd)}</span></div>
                <div className="flex justify-between"><span>Avg Win / Avg Loss</span><span className="font-mono">{formatUsd(pf.avgWinUsd)} / {formatUsd(pf.avgLossUsd)}</span></div>
                <div className="flex justify-between"><span>Max Drawdown</span><span className="font-mono">{formatPercent(-pf.maxDrawdownPct)}</span></div>
                <div className="flex justify-between"><span>Best / Worst</span><span className="font-mono">{formatUsd(pf.bestTradeUsd)} / {formatUsd(pf.worstTradeUsd)}</span></div>
                <div className="pt-2">
                  {(pf.bySymbol || []).map((b) => (
                    <div key={b.symbol} className="flex items-center justify-between text-xs">
                      <span>{b.symbol} × {b.trades}</span>
                      <Badge variant={b.pnl >= 0 ? "success" : "danger"}>{formatUsd(b.pnl)} · {b.winRatePct}%</Badge>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-text-muted">Memuat...</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
