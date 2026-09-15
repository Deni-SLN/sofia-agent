// Settings — Exchange (PRD §7.17): API keys, testnet, sync frequency, default pair.
"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEngineStatus } from "@/lib/hooks/use-engine";

export default function SettingsExchangePage() {
  const { data } = useEngineStatus(10000);
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [testnet, setTestnet] = useState(true);
  const [syncSec, setSyncSec] = useState(30);
  const [defaultPair, setDefaultPair] = useState("BTCUSDT");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const r = await fetch("/api/settings/exchange", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          apiSecret: apiSecret.trim(),
          testnet,
          syncSec: Number(syncSec),
          defaultPair: defaultPair.trim().toUpperCase(),
        }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      setMsg("Tersimpan. Restart engine untuk apply.");
      setApiKey("");
      setApiSecret("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Exchange</h1>
        <p className="text-sm text-text-muted">Konfigurasi koneksi exchange (V1: paper-trading, API key disimpan server via env).</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>Key disimpan di server (environment), tidak pernah di browser. V1: paper mode.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-text-secondary">API Key</label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={data?.health.mode === "PAPER" ? "Paper mode — key tidak wajib" : "Isi API key exchange"}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-text-secondary">API Secret</label>
            <Input type="password" value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} placeholder="Rahasia — hanya untuk LIVE" />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={testnet} onChange={(e) => setTestnet(e.target.checked)} />
            <span>Gunakan testnet/sandbox</span>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferensi</CardTitle>
          <CardDescription>Default pair + interval sinkronisasi market data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-text-secondary">Default pair</label>
            <Input value={defaultPair} onChange={(e) => setDefaultPair(e.target.value)} placeholder="BTCUSDT" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-text-secondary">Sync interval (detik)</label>
            <Input type="number" min={5} max={300} value={syncSec} onChange={(e) => setSyncSec(Number(e.target.value))} />
            <p className="text-[11px] text-text-muted">5–300 detik. Default 30.</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={busy}>{busy ? "Menyimpan..." : "Simpan"}</Button>
        {msg && <p className="text-sm text-success">{msg}</p>}
        {err && <p className="text-sm text-danger">{err}</p>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-text-muted space-y-1">
          <p>Mode: <span className="font-mono">{data?.health.mode}</span></p>
          <p>Market source: <span className="font-mono">{data?.health.marketSource}</span></p>
          <p>Testnet: <span className="font-mono">{testnet ? "YA" : "TIDAK"}</span></p>
        </CardContent>
      </Card>
    </div>
  );
}
