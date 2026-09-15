// Settings — Notifications (PRD §7.16): channel config, preferences, quiet hours.
"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const NS = "sofia.notif.settings.";

function load(): { telegramBot: string; telegramChat: string; discordWebhook: string; quietStart: string; quietEnd: string; minConfidence: number } {
  if (typeof localStorage === "undefined") return { telegramBot: "", telegramChat: "", discordWebhook: "", quietStart: "22:00", quietEnd: "07:00", minConfidence: 80 };
  try {
    const raw = localStorage.getItem(NS + "channels");
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { telegramBot: "", telegramChat: "", discordWebhook: "", quietStart: "22:00", quietEnd: "07:00", minConfidence: 80 };
}

export default function SettingsNotificationsPage() {
  const [cfg, setCfg] = useState(load);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function set<K extends keyof typeof cfg>(k: K, v: (typeof cfg)[K]) {
    setCfg((c) => ({ ...c, [k]: v }));
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      localStorage.setItem(NS + "channels", JSON.stringify(cfg));
      setMsg("Preferensi notifikasi tersimpan.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function testTelegram() {
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const r = await fetch("/api/notifications/test-telegram", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ botToken: cfg.telegramBot, chatId: cfg.telegramChat }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      setMsg("Test Telegram terkirim.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Notifikasi</h1>
        <p className="text-sm text-text-muted">Channel config, tipe notifikasi, quiet hours, confidence threshold.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Telegram</CardTitle>
          <CardDescription>Bot token + chat ID untuk notifikasi real-time</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-text-secondary">Bot Token</label>
            <Input type="password" value={cfg.telegramBot} onChange={(e) => set("telegramBot", e.target.value)} placeholder="123456:ABC-DEF..." />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-text-secondary">Chat ID</label>
            <Input value={cfg.telegramChat} onChange={(e) => set("telegramChat", e.target.value)} placeholder="-1001234567890" />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={testTelegram} disabled={busy || !cfg.telegramBot || !cfg.telegramChat}>Test kirim</Button>
            <span className="text-xs text-text-muted">Token disimpan lokal di browser.</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Discord</CardTitle>
          <CardDescription>Webhook URL untuk notifikasi ke channel Discord</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          <Input type="password" value={cfg.discordWebhook} onChange={(e) => set("discordWebhook", e.target.value)} placeholder="https://discord.com/api/webhooks/..." />
          <p className="text-[11px] text-text-muted">Opsional. V1: webhook sederhana.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quiet Hours & Threshold</CardTitle>
          <CardDescription>Jeda notifikasi di malam hari + minimum confidence sinyal</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-secondary">Mulai sunyi</label>
              <Input type="time" value={cfg.quietStart} onChange={(e) => set("quietStart", e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-secondary">Selesai sunyi</label>
              <Input type="time" value={cfg.quietEnd} onChange={(e) => set("quietEnd", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-text-secondary">Min confidence sinyal ({cfg.minConfidence})</label>
            <input type="range" min={0} max={100} value={cfg.minConfidence} onChange={(e) => set("minConfidence", Number(e.target.value))} className="w-full" />
            <p className="text-[11px] text-text-muted">Sinyal di bawah threshold tidak dikirim notifnya.</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={busy}>{busy ? "Menyimpan..." : "Simpan"}</Button>
        {msg && <p className="text-sm text-success">{msg}</p>}
        {err && <p className="text-sm text-danger">{err}</p>}
      </div>
    </div>
  );
}
