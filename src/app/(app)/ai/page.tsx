// AI Insights — skor 8 faktor + narasi LLM grounded (PRD 7.5).
"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEngineStatus } from "@/lib/hooks/use-engine";
import { formatUsd, formatDate } from "@/lib/utils";

const FACTORS = [
  { k: "technical", label: "Teknikal", w: "20%" },
  { k: "momentum", label: "Momentum", w: "15%" },
  { k: "orderFlow", label: "Order Flow", w: "15%" },
  { k: "regime", label: "Regime", w: "10%" },
  { k: "news", label: "News", w: "10%" },
  { k: "strategyFit", label: "Strategy Fit", w: "10%" },
  { k: "riskReward", label: "Risk:Reward", w: "10%" },
  { k: "liquidity", label: "Likuiditas", w: "10%" },
] as const;

export default function AiInsightsPage() {
  const { data } = useEngineStatus(5000);
  const signals = data?.signals || [];
  const [narr, setNarr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function explain(symbol: string) {
    setBusy(symbol);
    try {
      const r = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ symbol, timeframe: "60" }),
      });
      const j = await r.json();
      setNarr((n) => ({
        ...n,
        [symbol]: j.ok ? String(j.data.narrative || "(LLM tidak tersedia — lihat skor di atas)") : `Gagal: ${j.error}`,
      }));
    } catch (e) {
      setNarr((n) => ({ ...n, [symbol]: `Gagal: ${String(e)}` }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">AI Insights</h1>
      <p className="text-sm text-text-muted">
        Scoring deterministik 8 faktor (bukan tebakan LLM): LONG ≥ 80 · WAIT 60–79 · NO_TRADE &lt; 60.
      </p>
      <div className="space-y-4">
        {signals.slice(0, 15).map((s) => (
          <Card key={s.id}>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                {s.symbol}
                <Badge variant={s.action === "LONG" ? "success" : s.action === "WAIT" ? "warning" : "default"}>
                  {s.action} · {s.confidence}
                </Badge>
                <Badge variant="info">{s.strategy}</Badge>
                <Badge variant="default">{s.marketRegime}</Badge>
                <Badge variant="default">{s.state}</Badge>
                <span className="ml-auto text-xs font-normal text-text-muted">{formatDate(s.createdAt)}</span>
              </CardTitle>
              <CardDescription>
                entry {formatUsd(s.entry)} · SL {formatUsd(s.stopLoss)} · TP {formatUsd(s.takeProfit)} · R:R 1:{s.riskReward} · {s.invalidation}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {FACTORS.map((f) => (
                  <div key={f.k} className="rounded-lg border border-border p-2 text-xs">
                    <p className="text-text-muted">{f.label} ({f.w})</p>
                    <p className="font-mono text-sm font-semibold">{s.scores[f.k]}</p>
                    <div className="mt-1 h-1.5 rounded bg-surface-elevated">
                      <div className="h-full rounded bg-primary" style={{ width: `${Math.min(100, s.scores[f.k])}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-text-secondary">
                {s.reasons.slice(0, 6).map((r, i) => <li key={i}>{r}</li>)}
              </ul>
              <div className="mt-3">
                <Button size="sm" variant="outline" disabled={busy === s.symbol} onClick={() => explain(s.symbol)}>
                  {busy === s.symbol ? "Menganalisis..." : "Jelaskan dengan AI"}
                </Button>
                {narr[s.symbol] && <p className="mt-2 text-xs text-text-secondary whitespace-pre-wrap">{narr[s.symbol]}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
        {!signals.length && (
          <Card><CardContent className="py-6 text-sm text-text-muted">Belum ada keputusan AI. Jalankan engine dari Command Center.</CardContent></Card>
        )}
      </div>
    </div>
  );
}
