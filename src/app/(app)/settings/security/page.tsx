// Settings — Security (PRD §7.17): password, 2FA hint, sessions, API rotation, audit log.
"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SettingsSecurityPage() {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function changePw() {
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      if (next.length < 8) throw new Error("Password baru minimal 8 karakter");
      if (next !== confirm) throw new Error("Konfirmasi password tidak cocok");
      const r = await fetch("/api/settings/security/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ current: cur, next }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      setMsg("Password berhasil diubah.");
      setCur("");
      setNext("");
      setConfirm("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Keamanan</h1>
        <p className="text-sm text-text-muted">Password, 2FA, sesi aktif, dan audit log (V1: auth via Supabase).</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ubah Password</CardTitle>
          <CardDescription>Minimal 8 karakter. V1: dikelola Supabase auth.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-text-secondary">Password saat ini</label>
            <Input type="password" value={cur} onChange={(e) => setCur(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-text-secondary">Password baru</label>
            <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-text-secondary">Konfirmasi password baru</label>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <div className="flex items-center gap-3 pt-1">
            <Button onClick={changePw} disabled={busy || !cur || !next}>{busy ? "Mengubah..." : "Ubah password"}</Button>
            {msg && <p className="text-sm text-success">{msg}</p>}
            {err && <p className="text-sm text-danger">{err}</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2FA (Two-Factor Authentication)</CardTitle>
          <CardDescription>Keamanan ekstra untuk login & transaksi LIVE</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-text-muted space-y-2">
          <p>Status: <span className="font-mono text-warning">Belum aktif</span> — akan tersedia saat LIVE unlock.</p>
          <p>V1: 2FA dikelola via Supabase (TOTP).</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sesi Aktif</CardTitle>
          <CardDescription>Sesi login yang sedang berjalan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="font-medium text-text-primary">Browser ini</p>
              <p className="text-xs text-text-muted">Sesi saat ini</p>
            </div>
            <span className="rounded-full bg-success/20 px-2 py-0.5 text-xs text-success">Aktif</span>
          </div>
          <Button variant="outline" size="sm" disabled>Logout semua perangkat lain (V1: via Supabase)</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit Log</CardTitle>
          <CardDescription>Aktivitas keamanan terakhir</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-text-muted">
          <p>Login, ubah password, unlock LIVE, emergency stop — semua tercatat di event log engine.</p>
          <p className="mt-1">Lihat di <span className="text-primary">Command Center &gt; Event Feed</span>.</p>
        </CardContent>
      </Card>
    </div>
  );
}
