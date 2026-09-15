// Settings — konfigurasi Risk Engine (batas PRD §54) + info sesi.
"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEngineStatus } from "@/lib/hooks/use-engine";
import type { RiskConfig, NotificationType } from "@/lib/core/types";

const NS = "sofia.notif.";
const NOTIF_TYPES: Array<{ t: NotificationType; label: string }> = [
  { t: "TRADE", label: "Trade eksekusi / posisi tutup" },
  { t: "SIGNAL", label: "Sinyal AI tinggi" },
  { t: "RISK", label: "Risk engine / circuit breaker" },
  { t: "SYSTEM", label: "Engine mulai/stop" },
];

function notifEnabled(): boolean {
  if (typeof localStorage === "undefined") return true;
  return localStorage.getItem(`${NS}enabled`) !== "0";
}
function notifTypes(): NotificationType[] {
  if (typeof localStorage === "undefined") return ["TRADE", "SIGNAL", "RISK", "SYSTEM"];
  try {
    const t = JSON.parse(localStorage.getItem(`${NS}types`) || "");
    if (Array.isArray(t) && t.length) return t as NotificationType[];
  } catch { /* ignore */ }
  return ["TRADE", "SIGNAL", "RISK", "SYSTEM"];
}

const FIELDS: Array<{ k: keyof RiskConfig; label: string; hint: string; step?: string }> = [
  { k: "riskPerTradePct", label: "Risiko per trade (%)", hint: "PRD §54: 1%", step: "0.1" },
  { k: "maxDailyLossPct", label: "Max daily loss (%)", hint: "PRD §54: 3%", step: "0.1" },
  { k: "maxOpenPositions", label: "Max posisi terbuka", hint: "PRD §54: 1", step: "1" },
  { k: "maxConsecutiveLosses", label: "Max loss beruntun", hint: "PRD §27: 3", step: "1" },
  { k: "minRiskReward", label: "Min R:R", hint: "PRD §53: 2", step: "0.5" },
  { k: "maxPositionPct", label: "Max eksposur posisi (% equity)", hint: "95% (akun kecil Rp100rb agar min order $5 lolos)", step: "1" },
  { k: "leverage", label: "Leverage (x)", hint: "PRD §54: 1x", step: "1" },
  { k: "autoTradeMinConfidence", label: "Min confidence auto-trade", hint: "PRD §55: 80", step: "1" },
  { k: "trailingStopPct", label: "Trailing stop (%)", hint: "PRD §54: 1.5%", step: "0.1" },
  { k: "takerFeePct", label: "Taker fee (%)", hint: "Bybit spot 0.1%", step: "0.01" },
  { k: "slippagePct", label: "Slippage simulasi (%)", hint: "0.05%", step: "0.01" },
];

export default function SettingsPage() {
  const { data, refetch } = useEngineStatus(10000);
  const [vals, setVals] = useState<Partial<Record<keyof RiskConfig, string>>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [nOn, setNOn] = useState<boolean>(notifEnabled());
  const [nTypes, setNTypes] = useState<NotificationType[]>(notifTypes());
  const cfg = data?.riskConfig;

  function toggleType(t: NotificationType) {
    const next = nTypes.includes(t) ? nTypes.filter((x) => x !== t) : [...nTypes, t];
    setNTypes(next);
    localStorage.setItem(`${NS}types`, JSON.stringify(next));
  }

  function val(k: keyof RiskConfig): string {
    if (vals[k] !== undefined) return vals[k] as string;
    const v = cfg?.[k];
    return typeof v === "number" ? String(v) : "";
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const body: Record<string, number> = {};
      for (const f of FIELDS) {
        const raw = vals[f.k];
        if (raw === undefined || raw === "") continue;
        body[f.k] = Number(raw);
      }
      const r = await fetch("/api/risk", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      setVals({});
      setMsg("Konfigurasi risiko tersimpan.");
      await refetch();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Risk Engine</CardTitle>
          <CardDescription>Berlaku untuk auto-trade maupun order manual (non-bypassable).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FIELDS.map((f) => (
              <div key={f.k} className="space-y-1">
                <label className="text-xs font-medium text-text-secondary">{f.label}</label>
                <Input
                  type="number"
                  step={f.step || "any"}
                  value={cfg ? val(f.k) : ""}
                  placeholder={cfg ? String(cfg[f.k]) : ""}
                  onChange={(e) => setVals((v) => ({ ...v, [f.k]: e.target.value }))}
                />
                <p className="text-[11px] text-text-muted">{f.hint}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Button onClick={save} disabled={busy}>{busy ? "Menyimpan..." : "Simpan"}</Button>
            {msg && <p className="text-sm text-text-muted">{msg}</p>}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Notifikasi</CardTitle>
          <CardDescription>Browser push (installable PWA) — seting bersimpan lokal di browser</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-primary">Push notifikasi browser</p>
              <p className="text-xs text-text-muted">
                {typeof window !== "undefined" && "Notification" in window
                  ? window.Notification.permission === "granted"
                    ? "Izin granted ✓"
                    : window.Notification.permission === "denied"
                      ? "Izin DITOLAK — ubah di pengaturan browser"
                      : "Belum ada izin — klik 'Aktifkan' untuk perminta"
                  : "Browser tidak didukung Notification API"}
              </p>
            </div>
            <Button
              variant={nOn ? "default" : "outline"}
              onClick={() => {
                const next = !nOn;
                setNOn(next);
                localStorage.setItem(`${NS}enabled`, next ? "1" : "0");
                if (next && "Notification" in window && window.Notification.permission === "default") {
                  void window.Notification.requestPermission();
                }
              }}
            >
              {nOn ? "Aktif" : "Aktifkan"}
            </Button>
          </div>
          <div className="space-y-1.5">
            {NOTIF_TYPES.map(({ t, label }) => (
              <label key={t} className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={nTypes.includes(t)} onChange={() => toggleType(t)} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Sesi &amp; Keamanan</CardTitle>
          <CardDescription>Mode engine {data?.health.mode} · LIVE unlocked: {data?.health.liveUnlocked ? "YA" : "TIDAK"}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-text-muted">
          Secret &amp; API key Bybit (untuk LIVE nanti) dikelola via environment server, tidak pernah disimpan di browser.
        </CardContent>
      </Card>
    </div>
  );
}
