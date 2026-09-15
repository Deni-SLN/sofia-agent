// SOFIA Manager — chat asisten deterministik dari state engine live.
"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

interface Msg { role: "user" | "sofia"; text: string }

const QUICK = ["portfolio", "posisi", "risiko", "performa", "sinyal", "help"];

export default function SofiaManagerPage() {
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "sofia", text: "Halo! Saya SOFIA Manager. Tanya portfolio, posisi, risiko, performa, atau sinyal — semua dari data engine live. Ketik 'help' untuk panduan." },
  ]);
  const [inp, setInp] = useState("");
  const [busy, setBusy] = useState(false);
  const [meta, setMeta] = useState<{ provider: string; cached: boolean } | null>(null);
  const [det, setDet] = useState<boolean | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/sofia-chat").then((r) => r.json()).then((j) => {
      if (j.ok) setDet(Boolean(j.data.deterministic));
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length]);

  async function send(text?: string) {
    const message = (text ?? inp).trim();
    if (!message || busy) return;
    setInp("");
    setMsgs((m) => [...m, { role: "user", text: message }]);
    setBusy(true);
    try {
      const r = await fetch("/api/sofia-chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const j = await r.json();
      const d = j.data || {};
      const reply = j.ok ? String(d.reply) : `Error: ${j.error}`;
      const tag = d.llm ? ` [${d.provider}${d.cached ? "·cache" : ""}]` : "";
      setMsgs((m) => [...m, { role: "sofia", text: reply + tag }]);
      setMeta(d.llm ? { provider: String(d.provider || "?"), cached: Boolean(d.cached) } : null);
    } catch (e) {
      setMsgs((m) => [...m, { role: "sofia", text: `Gagal: ${String(e)}` }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">SOFIA Manager</h1>
        <p className="text-sm text-text-muted">Asisten trading — jawaban dari data engine live + LLM (grounded, bukan tebakan).</p>
      </div>
      {(det || meta) && (
        <p className="text-xs text-text-muted">
          {meta ? `LLM: ${meta.provider}${meta.cached ? " (cache)" : ""}` : det ? "Mode deterministik — isi API key AI untuk LLM" : ""}
        </p>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Chat</CardTitle>
          <CardDescription>Contoh: &quot;bagaimana portfolio?&quot;, &quot;ada posisi apa?&quot;, &quot;apakah aman?&quot;</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[420px] overflow-y-auto space-y-3 rounded-lg border border-border p-3 bg-background">
            {msgs.map((m, i) => (
              <div key={i} className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${m.role === "user" ? "ml-auto bg-primary text-white" : "bg-surface-elevated text-text-primary"}`}>
                {m.text}
              </div>
            ))}
            {busy && <p className="text-xs text-text-muted">SOFIA mengetik...</p>}
            <div ref={bottom} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK.map((q) => (
              <Button key={q} size="sm" variant="outline" onClick={() => send(q)} disabled={busy}>{q}</Button>
            ))}
          </div>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <Input
              value={inp}
              onChange={(e) => setInp(e.target.value)}
              placeholder="Tanya SOFIA... (mis. performa minggu ini?)"
              disabled={busy}
            />
            <Button type="submit" disabled={busy || !inp.trim()} size="icon" aria-label="Kirim">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
