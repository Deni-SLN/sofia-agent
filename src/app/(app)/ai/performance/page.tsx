// AI Performance halaman (PRD §7.13): respons, error, biaya & token.
"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AiTask } from "@/lib/core/ai-types";

interface Status {
  configured: { id: string; label: string; model: string; priority: number }[];
  health: Record<string, { ok: boolean; latencyMs: number | null; errorRate: number; lastError: string | null }>;
  usageToday: { costUsd: number; requests: number; cacheHits: number; byProvider: Record<string, { costUsd: number; requests: number; errors: number }> };
  usageMonth: { costUsd: number; requests: number; cacheHits: number; byProvider: Record<string, { costUsd: number; requests: number; errors: number }> };
}

export default function AiPerformancePage() {
  const [st, setSt] = useState<Status | null>(null);
  const [filter, setFilter] = useState<AiTask | "all">("all");
  async function load() {
    const r = await fetch("/api/ai/status");
    const j = await r.json();
    if (j.ok) setSt(j.data);
  }
  useEffect(() => { void load(); const t = setInterval(load, 60_000); return () => clearInterval(t); }, []);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">AI Performance</h1>
        <p className="text-sm text-text-muted">PRD §7.13: respons, error, biaya & token.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Ringkasan Hari Ini</CardTitle></CardHeader>
        <CardContent>
          {st ? (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-text-muted">Permintaan</p>
                <p className="text-xl font-mono font-semibold">{st.usageToday.requests}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Cache hit</p>
                <p className="text-xl font-mono font-semibold">{st.usageToday.cacheHits}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Biaya</p>
                <p className="text-xl font-mono font-semibold">${st.usageToday.costUsd.toFixed(4)}</p>
              </div>
            </div>
          ) : (
            <div className="text-sm text-text-muted">Memuat...</div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Perbandingan Provider</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2 pr-2 text-text-muted">Provider</th>
                <th className="py-2 pr-2 text-text-muted">Model</th>
                <th className="py-2 pr-2 text-text-muted">Resp (ms)</th>
                <th className="py-2 pr-2 text-text-muted">Acak</th>
                <th className="py-2 pr-2 text-text-muted">Sukses</th>
                <th className="py-2 pr-2 text-text-muted">Beban</th>
                <th className="py-2 pr-2 text-text-muted">Kesalahan</th>
                <th className="py-2 pr-2 text-text-muted">Biaya ($)</th>
              </tr>
            </thead>
            <tbody>
              {st?.configured.map((p) => {
                const h = st.health[p.id];
                const u = st.usageToday.byProvider[p.id];
                const total = (u?.requests || 0) + (u?.errors || 0);
                return (
                  <tr key={p.id} className="border-b border-border/60">
                    <td className="py-2 pr-2 font-medium">{p.label}</td>
                    <td className="py-2 pr-2 font-mono text-xs">{p.model}</td>
                    <td className="py-2 pr-2 font-mono">{h?.latencyMs ?? "—"}</td>
                    <td className="py-2 pr-2">{h?.ok ? <Badge variant="success">ok</Badge> : <Badge variant="danger">FAIL</Badge>}</td>
                    <td className="py-2 pr-2">{100 - (h?.errorRate ?? 0)}%</td>
                    <td className="py-2 pr-2">{total}</td>
                    <td className="py-2 pr-2">{u?.errors ?? 0}</td>
                    <td className="py-2 pr-2 font-mono">{u?.costUsd.toFixed(4)}</td>
                  </tr>
                );
              })}
              {(!st?.configured || !st.configured.length) && (
                <tr>
                  <td colSpan={8} className="py-3 text-text-muted">Belum ada provider yang aktif.</td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Filter per tugas</CardTitle>
          <CardDescription>Batasi tampilan berdasarkan tugas AI.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>Semua</Button>
            <Button variant={filter === "chat" ? "default" : "outline"} size="sm" onClick={() => setFilter("chat")}>chat</Button>
            <Button variant={filter === "narrative" ? "default" : "outline"} size="sm" onClick={() => setFilter("narrative")}>narrative</Button>
            <Button variant={filter === "analysis" ? "default" : "outline"} size="sm" onClick={() => setFilter("analysis")}>analysis</Button>
            <Button variant={filter === "news" ? "default" : "outline"} size="sm" onClick={() => setFilter("news")}>news</Button>
          </div>
          <p className="mt-3 text-xs text-text-muted">
            Per-tugas hanya pandangan cepat; data provider bersumber dari seluruh aktivitas router hari ini.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}