// AI Router admin (PRD 7.4): provider, routing, budget, cache, health.
"use client";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
interface Status { configured: { id: string; label: string; model: string }[]; unconfigured: { id: string; label: string; env: string }[]; budget: { daily: number; monthly: number; usedDaily: number; usedMonthly: number; dailyPct: number; monthlyPct: number; blocked: boolean }; usageToday: { requests: number; cacheHits: number; byProvider: Record<string, { costUsd: number; requests: number; errors: number }> }; health: Record<string, { ok: boolean; latencyMs: number | null; lastError: string | null }>; cache: { size: number; ttlMs: number }; }
export default function AiRouterPage() {
  const [st, setSt] = useState<Status | null>(null);
  const [msg, setMsg] = useState("");
  async function load() {
    const r = await fetch("/api/ai/status"); const j = await r.json();
    if (j.ok) setSt(j.data);
  }
  useEffect(() => { void load(); }, []);
  async function clear() {
    setMsg("Menghapus...");
    const r = await fetch("/api/ai/status", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "clear-cache" }) });
    const j = await r.json();
    setMsg(j.ok ? `Cache dihapus (${j.data.cleared})` : `Gagal: ${j.error}`);
    await load();
  }
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-text-primary">AI Router</h1>
      <p className="text-sm text-text-muted">Provider LLM, budget, cache & health. Angka trading tetap deterministik (bukan dari LLM).</p></div>
      <Card><CardHeader><CardTitle>Budget</CardTitle></CardHeader><CardContent>
        {st ? <p className="text-sm">Harian ${st.budget.usedDaily.toFixed(4)} / ${st.budget.daily} ({st.budget.dailyPct}%) · Bulanan ${st.budget.usedMonthly.toFixed(4)} / ${st.budget.monthly} ({st.budget.monthlyPct}%) {st.budget.blocked && <Badge variant="danger">BLOCKED</Badge>}</p> : <p className="text-sm text-text-muted">Memuat...</p>}
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Provider terkonfigurasi ({st?.configured.length || 0})</CardTitle></CardHeader><CardContent>
        <div className="flex flex-wrap gap-2">{st?.configured.map((p) => <Badge key={p.id} variant="success">{p.label} · {p.model}</Badge>)}
        {!st?.configured.length && <p className="text-sm text-text-muted">Belum ada — isi API key di .env.local</p>}</div>
        {!!st?.unconfigured.length && <p className="mt-2 text-xs text-text-muted">Belum diset: {st.unconfigured.map((u) => `${u.label} (${u.env})`).join(", ")}</p>}
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Cache & Health</CardTitle></CardHeader><CardContent>
        <p className="text-sm">Cache: {st?.cache.size || 0} entri (TTL {Math.round((st?.cache.ttlMs || 0) / 60000)} mnt) · Hit hari ini: {st?.usageToday.cacheHits || 0}/{st?.usageToday.requests || 0}</p>
        <div className="mt-2 flex gap-2"><Button size="sm" variant="outline" onClick={clear}>Clear cache</Button><Button size="sm" variant="outline" onClick={load}>Refresh</Button></div>
        {msg && <p className="mt-2 text-xs text-text-muted">{msg}</p>}
      </CardContent></Card>
    </div>
  );
}
