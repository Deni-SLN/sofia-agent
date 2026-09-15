// Strategy Builder (PRD §7.6): pilih strategi builtin, atur parameter,
// jalankan backtest cepat, simpan/hapus strategi kustom.
"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { BacktestResult } from "@/lib/core/backtest";
import type { StrategyParamDef, SavedStrategy } from "@/lib/core/strategies";

interface BuiltinMeta { id: string; name: string; desc: string; params: StrategyParamDef[] }
interface ApiData { builtins: BuiltinMeta[]; saved: SavedStrategy[] }
const INTERVALS = ["15", "30", "60", "240", "D"];

export default function StrategyPage() {
  const [data, setData] = useState<ApiData | null>(null);
  const [type, setType] = useState("MA_CROSS");
  const [name, setName] = useState("");
  const [params, setParams] = useState<Record<string, string>>({});
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [interval, setInterval] = useState("60");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [result, setResult] = useState<BacktestResult | null>(null);

  const builtin = useMemo(
    () => data?.builtins.find((b) => b.id === type) || null,
    [data, type]
  );

  async function load() {
    try {
      const r = await fetch("/api/strategies");
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      setData(j.data);
      if (j.data.builtins.length && !j.data.builtins.some((b: BuiltinMeta) => b.id === type)) {
        setType(j.data.builtins[0].id);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  function pval(k: string, def: number): string {
    return params[k] !== undefined ? params[k] : String(def);
  }

  async function runBacktest(strategyPayload: { type?: string; id?: string; params?: Record<string, number> }) {
    setBusy("bt");
    setErr(null);
    setMsg(null);
    try {
      const r = await fetch("/api/backtest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ symbol, interval, limit: 500, strategy: strategyPayload }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      setResult(j.data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    if (!builtin) return;
    setBusy("save");
    setErr(null);
    setMsg(null);
    try {
      const numParams: Record<string, number> = {};
      for (const d of builtin.params) numParams[d.key] = Number(pval(d.key, d.def));
      const r = await fetch("/api/strategies", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name || `${builtin.name} (custom)`, type: builtin.id, params: numParams }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      setMsg(`Strategi "${j.data.name}" tersimpan.`);
      setName("");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function removeSaved(id: string) {
    setBusy(`del-${id}`);
    try {
      const r = await fetch(`/api/strategies?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Strategy Builder</h1>
        <p className="text-sm text-text-muted">
          Strategi builtin deterministik (bukan LLM) — atur parameter, uji via backtest, simpan.
        </p>
      </div>

      {err && <p className="text-sm text-danger">{err}</p>}
      {msg && <p className="text-sm text-success">{msg}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Builder</CardTitle>
            <CardDescription>{builtin?.desc || "Pilih tipe strategi"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-text-muted">Tipe strategi</label>
                <select
                  value={type}
                  onChange={(e) => { setType(e.target.value); setParams({}); }}
                  className="h-9 w-full rounded-btn border border-border bg-background px-2 text-sm text-text-primary"
                >
                  {(data?.builtins || []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-text-muted">Nama (untuk disimpan)</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mis. MA Cross konservatif" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(builtin?.params || []).map((d) => (
                <div key={d.key} className="space-y-1">
                  <label className="text-xs text-text-muted">{d.label} ({d.min}–{d.max})</label>
                  <Input
                    type="number"
                    step={d.step}
                    min={d.min}
                    max={d.max}
                    value={pval(d.key, d.def)}
                    onChange={(e) => setParams((v) => ({ ...v, [d.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-text-muted">Simbol</label>
                <Input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-text-muted">Interval</label>
                <select
                  value={interval}
                  onChange={(e) => setInterval(e.target.value)}
                  className="h-9 w-full rounded-btn border border-border bg-background px-2 text-sm text-text-primary"
                >
                  {INTERVALS.map((iv) => <option key={iv} value={iv}>{iv === "D" ? "1 Hari" : `${iv} menit`}</option>)}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                disabled={busy !== null || !builtin}
                onClick={() => {
                  if (!builtin) return;
                  const numParams: Record<string, number> = {};
                  for (const d of builtin.params) numParams[d.key] = Number(pval(d.key, d.def));
                  void runBacktest({ type: builtin.id, params: numParams });
                }}
              >
                {busy === "bt" ? "Menjalankan..." : "Backtest cepat"}
              </Button>
              <Button variant="outline" disabled={busy !== null || !builtin} onClick={save}>
                {busy === "save" ? "Menyimpan..." : "Simpan strategi"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hasil Backtest</CardTitle>
            <CardDescription>
              {result ? `${result.symbol} · ${result.interval} · ${result.strategy} · ${result.candles} candle` : "Belum ada hasil"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                <Stat label="Return" value={`${result.returnPct >= 0 ? "+" : ""}${result.returnPct}%`} />
                <Stat label="Total PnL" value={`$${result.totalPnlUsd.toFixed(2)}`} />
                <Stat label="Balance akhir" value={`$${result.endingBalanceUsd.toFixed(2)}`} />
                <Stat label="Trades" value={String(result.trades.length)} />
                <Stat label="Win rate" value={`${result.winRatePct}%`} />
                <Stat label="Profit factor" value={result.profitFactor != null ? String(result.profitFactor) : "—"} />
                <Stat label="Max DD" value={`${result.maxDrawdownPct}%`} />
                <Stat label="Wins/Losses" value={`${result.wins}/${result.losses}`} />
              </div>
            ) : (
              <p className="text-sm text-text-muted">Klik &quot;Backtest cepat&quot; untuk menguji parameter saat ini.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Strategi tersimpan ({data?.saved.length || 0})</CardTitle>
          <CardDescription>Terpersist di snapshot Supabase bila env aktif</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {!data?.saved.length && <p className="text-sm text-text-muted">Belum ada strategi tersimpan.</p>}
          {(data?.saved || []).map((sv) => (
            <div key={sv.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2 text-sm">
              <span className="font-medium text-text-primary">{sv.name}</span>
              <Badge variant="info">{sv.type}</Badge>
              <span className="text-xs text-text-muted">
                {Object.entries(sv.params).map(([k, v]) => `${k}=${v}`).join(" · ")}
              </span>
              <span className="ml-auto flex gap-2">
                <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => void runBacktest({ id: sv.id })}>
                  Backtest
                </Button>
                <Button size="sm" variant="danger" disabled={busy !== null} onClick={() => void removeSaved(sv.id)}>
                  Hapus
                </Button>
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-2">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="font-mono font-semibold text-text-primary">{value}</p>
    </div>
  );
}