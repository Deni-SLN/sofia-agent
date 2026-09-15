// Command Center — pusat kendali engine SOFIA (PRD §25).
// PAPER/LIVE jelas, autorisasi LIVE dua langkah, START/STOP,
// EMERGENCY STOP, pemakaian risiko, status agen, event feed.
"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  OctagonX,
  Play,
  Square,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Lock,
  Unlock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEngineStatus, postJSON } from "@/lib/hooks/use-engine";
import { formatUsd, formatPercent, formatDate } from "@/lib/utils";

function stateColor(state: string): "success" | "danger" | "warning" | "default" {
  if (state === "RUNNING") return "success";
  if (state === "HALTED") return "danger";
  if (state === "STARTING") return "warning";
  return "default";
}

export default function CommandCenterPage() {
  const { data, isLoading, error, refetch } = useEngineStatus(3000);
  const qc = useQueryClient();
  const [mode, setMode] = useState<"PAPER" | "LIVE">("PAPER");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showEmergency, setShowEmergency] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState("");
  const [showUnlock, setShowUnlock] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmLive, setConfirmLive] = useState(false);

  async function act(label: string, fn: () => Promise<unknown>) {
    setBusy(label);
    setErr(null);
    try {
      await fn();
      await refetch();
      qc.invalidateQueries();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  const h = data?.health;
  const acct = data?.account;
  const riskUsedPct = acct ? Math.max(0, Math.min(100, (Math.abs(acct.dailyPnl) / Math.max(acct.equity, 1)) * 100)) : 0;
  const dailyLimit = data?.riskConfig.maxDailyLossPct ?? 3;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Command Center</h1>
          <p className="text-sm text-text-muted">
            Kendali penuh engine trading otonom SOFIA. Default selalu PAPER.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={h ? stateColor(h.state) : "default"}>
            {h ? `SOFIA ${h.state}` : "MEMUAT"}
          </Badge>
          <Badge variant={mode === "PAPER" ? "info" : "danger"}>{mode}</Badge>
          {h?.halted && <Badge variant="danger">HALTED</Badge>}
          <Button variant="outline" size="icon" onClick={() => refetch()} aria-label="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {err && (
        <Card className="border-danger/40 bg-danger/10">
          <CardContent className="flex items-center gap-2 py-3 text-sm text-danger">
            <AlertTriangle className="h-4 w-4" /> {err}
          </CardContent>
        </Card>
      )}

      {/* Kontrol utama */}
      <Card>
        <CardHeader>
          <CardTitle>Kontrol Engine</CardTitle>
          <CardDescription>
            Pilih mode, mulai/stop loop otonom, atau hentikan darurat. Mode LIVE butuh unlock PIN +
            konfirmasi eksplisit (PRD §25).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-border p-1">
            {(["PAPER", "LIVE"] as const).map((m) => (
              <Button
                key={m}
                variant={mode === m ? (m === "PAPER" ? "default" : "danger") : "ghost"}
                size="sm"
                onClick={() => setMode(m)}
              >
                {m}
              </Button>
            ))}
          </div>
          <Button
            onClick={() => act("start", () => postJSON("/api/engine/start", { mode }))}
            disabled={busy !== null || h?.state === "RUNNING"}
          >
            <Play className="mr-2 h-4 w-4" />
            {busy === "start" ? "Memulai..." : `START ${mode}`}
          </Button>
          <Button
            variant="outline"
            onClick={() => act("stop", () => postJSON("/api/engine/stop", { reason: "manual dari UI" }))}
            disabled={busy !== null || h?.state !== "RUNNING"}
          >
            <Square className="mr-2 h-4 w-4" />
            {busy === "stop" ? "Stop..." : "STOP"}
          </Button>
          <Button variant="danger" onClick={() => setShowEmergency(true)} disabled={busy !== null}>
            <OctagonX className="mr-2 h-4 w-4" /> EMERGENCY STOP
          </Button>
          {h?.halted ? (
            <Button
              variant="outline"
              onClick={() => act("clear", () => postJSON("/api/engine/clear-halt", {}))}
              disabled={busy !== null}
            >
              <ShieldCheck className="mr-2 h-4 w-4" /> Cabut Halt
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => setShowUnlock(true)} disabled={busy !== null}>
              {data?.health.liveUnlocked ? <Unlock className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
              {data?.health.liveUnlocked ? "LIVE Unlocked" : "Unlock LIVE"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Status runtime */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Equity Paper</CardDescription>
            <CardTitle className="text-2xl">{acct ? formatUsd(acct.equity) : "—"}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-text-muted">
            {acct ? (
              <>
                Balance {formatUsd(acct.balanceUsd)} · Unrealized {formatUsd(acct.unrealizedPnl)}
                <br />
                Daily P&amp;L{" "}
                <span className={acct.dailyPnl >= 0 ? "text-success" : "text-danger"}>
                  {formatUsd(acct.dailyPnl)}
                </span>
              </>
            ) : isLoading ? "Memuat..." : error ? "Gagal memuat status" : "—"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pemakaian Risiko Harian</CardDescription>
            <CardTitle className="text-2xl">
              {acct ? formatPercent((acct.dailyPnl / Math.max(acct.equity, 1)) * 100) : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={Math.min(100, (riskUsedPct / Math.max(dailyLimit, 0.01)) * 100)} className="h-2" />
            <p className="mt-2 text-xs text-text-muted">
              Limit {dailyLimit}% · {h?.halted ? `HALT: ${h.haltedReason}` : "Circuit breaker aktif"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Posisi Terbuka</CardDescription>
            <CardTitle className="text-2xl">
              {data ? data.positions.length : "—"} / {data?.riskConfig.maxOpenPositions ?? 1}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-text-muted">
            Order: {data?.orders.length ?? "—"} · Sinyal: {data?.signals.length ?? "—"}
            <br />
            Market: {h?.marketSource ?? "—"} · Siklus: {h?.cycles ?? 0}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Kurs &amp; Uptime</CardDescription>
            <CardTitle className="text-2xl">{data ? `Rp${data.currency.usdIdr.toLocaleString("id-ID")}` : "—"}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-text-muted">
            1 USD · via {data?.currency.source} · Error: {h?.errors ?? 0}
            <br />
            Sejak: {h?.startedAt ? formatDate(h.startedAt) : "—"}
          </CardContent>
        </Card>
      </div>

      {/* Agen */}
      <Card>
        <CardHeader>
          <CardTitle>Status Agen</CardTitle>
          <CardDescription>13 agen analis + Risk Engine &amp; Execution Engine</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {(data?.agents || []).map((a) => (
            <div key={a.name} className="flex items-center justify-between rounded-lg border border-border p-2 text-sm">
              <div>
                <p className="font-medium">{a.name}</p>
                <p className="text-xs text-text-muted">
                  {a.lastTask || a.role} · {a.runs} runs
                </p>
              </div>
              <Badge variant={a.status === "ONLINE" ? "success" : a.status === "ERROR" ? "danger" : "default"}>
                {a.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Event feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {h?.halted ? <ShieldAlert className="h-5 w-5 text-danger" /> : <ShieldCheck className="h-5 w-5 text-success" />}
            Event Feed
          </CardTitle>
          <CardDescription>Audit trail keputusan engine (scan, risk, trade, halt)</CardDescription>
        </CardHeader>
        <CardContent className="max-h-96 space-y-2 overflow-y-auto">
          {(data?.events || []).map((e) => (
            <div key={e.id} className="rounded-lg border border-border p-2 text-xs">
              <div className="flex items-center gap-2">
                <Badge variant={e.level === "ERROR" ? "danger" : e.level === "WARN" ? "warning" : "default"}>
                  {e.level}
                </Badge>
                <span className="font-medium">{e.source}</span>
                <span className="ml-auto text-text-muted">{formatDate(e.ts)}</span>
              </div>
              <p className="mt-1 text-text-secondary">{e.message}</p>
            </div>
          ))}
          {!data?.events?.length && <p className="text-sm text-text-muted">Belum ada event.</p>}
        </CardContent>
      </Card>

      <Dialog open={showEmergency} onOpenChange={setShowEmergency}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-danger">Emergency Stop</DialogTitle>
            <DialogDescription>
              Menghentikan SEMUA trading baru dan meng-halt engine. Tulis alasan untuk audit trail.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Alasan emergency stop (wajib tercatat)"
            value={emergencyReason}
            onChange={(e) => setEmergencyReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmergency(false)}>Batal</Button>
            <Button
              variant="danger"
              disabled={!emergencyReason.trim() || busy !== null}
              onClick={() =>
                act("emergency", () => postJSON("/api/engine/emergency-stop", { reason: emergencyReason })).then(() =>
                  setShowEmergency(false)
                )
              }
            >
              {busy === "emergency" ? "Menghentikan..." : "HENTIKAN SEKARANG"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showUnlock} onOpenChange={setShowUnlock}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Autorisasi Mode LIVE</DialogTitle>
            <DialogDescription>
              PIN + centang konfirmasi eksplisit. V1: eksekusi LIVE tetap diblokir server.
            </DialogDescription>
          </DialogHeader>
          <Input
            type="password"
            placeholder="PIN (min 4 karakter)"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
          />
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={confirmLive} onChange={(e) => setConfirmLive(e.target.checked)} />
            Saya memahami risiko dana nyata dan menyetujui unlock LIVE.
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnlock(false)}>Batal</Button>
            <Button
              disabled={!pin || !confirmLive || busy !== null}
              onClick={() =>
                act("unlock", () => postJSON("/api/engine/live-unlock", { pin, confirm: confirmLive })).then(() => {
                  setShowUnlock(false);
                  setPin("");
                  setConfirmLive(false);
                })
              }
            >
              {busy === "unlock" ? "Membuka..." : "Unlock LIVE"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
