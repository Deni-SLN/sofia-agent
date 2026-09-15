// AI Prompt Library (PRD §7.12): CRUD prompts dengan variabel {{symbol}} {{timeframe}} dll.
"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Prompt { id: string; name: string; category: string; content: string; version: number; updatedAt: string }
const CATEGORIES = ["Trading", "News", "Technical", "Portfolio", "Risk", "Custom"];

export default function AiPromptsPage() {
  const [list, setList] = useState<Prompt[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Trading");
  const [content, setContent] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    try {
      const r = await fetch("/api/prompts");
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      setList(j.data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  function reset() { setName(""); setCategory("Trading"); setContent(""); setEditId(null); }

  async function save() {
    setBusy(true); setErr(null); setMsg(null);
    try {
      const url = editId ? `/api/prompts?id=${encodeURIComponent(editId)}` : "/api/prompts";
      const method = editId ? "PUT" : "POST";
      const r = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify({ name, category, content }) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      setMsg(editId ? "Prompt diperbarui." : "Prompt dibuat.");
      reset();
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }


  async function remove(id: string) {
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`/api/prompts?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      if (editId === id) reset();
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  function startEdit(p: Prompt) {
    setEditId(p.id);
    setName(p.name);
    setCategory(p.category);
    setContent(p.content);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">AI Prompt Library</h1>
        <p className="text-sm text-text-muted">Kelola prompt template dengan variabel: {`{{symbol}}`} {`{{timeframe}}`} {`{{price}}`} {`{{indicators}}`} {`{{news}}`} {`{{portfolio}}`}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{editId ? "Edit prompt" : "Buat prompt baru"}</CardTitle>
          <CardDescription>Variabel akan diisi saat runtime oleh engine</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-secondary">Nama</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mis. Analisis teknikal BTC" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-secondary">Kategori</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm">
                {CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-text-secondary">Konten prompt</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6} className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm font-mono" placeholder={"Analisis teknikal {{symbol}} timeframe {{timeframe}}. Harga saat ini {{price}}. Berikan skor 0-100."} />
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={save} disabled={busy || !name.trim() || !content.trim()}>{busy ? "Menyimpan..." : editId ? "Perbarui" : "Simpan"}</Button>
            {editId && <Button variant="outline" onClick={reset} disabled={busy}>Batal edit</Button>}
            {msg && <p className="text-sm text-success">{msg}</p>}
            {err && <p className="text-sm text-danger">{err}</p>}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Prompt tersimpan ({list.length})</CardTitle>
          <CardDescription>Klik untuk edit</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {!list.length && <p className="text-sm text-text-muted">Belum ada prompt tersimpan.</p>}
          {list.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3 text-sm">
              <span className="font-medium text-text-primary">{p.name}</span>
              <Badge variant="info">{p.category}</Badge>
              <span className="text-xs text-text-muted">v{p.version}</span>
              <span className="ml-auto flex gap-2">
                <Button size="sm" variant="outline" onClick={() => startEdit(p)} disabled={busy}>Edit</Button>
                <Button size="sm" variant="danger" onClick={() => void remove(p.id)} disabled={busy}>Hapus</Button>
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

