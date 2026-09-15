// Risk Settings — editor cepat batas utama + dry-run validasi sinyal.
"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useEngineStatus } from "@/lib/hooks/use-engine";
import type { RiskValidation } from "@/lib/core/types";

export default function RiskSettingsPage() {
  const { data, refetch } = useEngineStatus(10000);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [entry, setEntry] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [dry, setDry] = useState<RiskValidation | null>(null);

  async function quick(k: string, v: number) {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/risk", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ [k]: v }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      await refetch();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function dryRun() {
    setMsg(null);
    try {
      const r = await fetch("/api/risk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          symbol, action: "LONG", entry: Number(entry),
          stopLoss: Number(stopLoss), takeProfit: Number(takeProfit),
        }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      setDry(j.data);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  }

  const cfg = data?.riskConfig;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Risk Management</h1>
      {msg && <p className="text-sm text-danger">{msg}</p>}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Batas Aktif</CardTitle>
            <CardDescription>Ubah cepat — tersimpan ke engine</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {cfg && (Object.keys(cfg) as Array<keyof typeof cfg>).slice(0, 13).map((k) => (
              <div key={k} className="flex items-center justify-between gap-2">
                <span className="text-text-secondary">{k}</span>
                <span className="font-mono">{String(cfg[k])}</span>
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <Button size="sm" variant="outline" disabled={busy} onClick={() => quick("riskPerTradePct", 1)}>Risk 1%</Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => quick("maxDailyLossPct", 3)}>Daily 3%</Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => quick("maxOpenPositions", 1)}>1 Posisi</Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Dry-Run Validasi Sinyal</CardTitle>
            <CardDescription>Cek lolos/tidaknya setup tanpa eksekusi</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Symbol" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} />
              <Input placeholder="Entry" value={entry} onChange={(e) => setEntry(e.target.value)} inputMode="decimal" />
              <Input placeholder="Stop Loss" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} inputMode="decimal" />
              <Input placeholder="Take Profit" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} inputMode="decimal" />
            </div>
            <Button onClick={dryRun}>Validasi</Button>
            {dry && (
              <div className="space-y-1 text-xs">
                <Badge variant={dry.approved ? "success" : "danger"}>{dry.approved ? "APPROVED" : "REJECTED"}</Badge>
                {dry.checks.map((c) => (
                  <div key={c.name} className="flex gap-2">
                    <span className={c.passed ? "text-chart-up" : "text-chart-down"}>{c.passed ? "✓" : "✗"}</span>
                    <span className="font-medium">{c.name}</span>
                    <span className="text-text-muted">{c.detail}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
