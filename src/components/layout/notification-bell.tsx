// Notification bell (PRD §7.16): poll /api/notifications, badge unread,
// dropdown list + mark-all-read, dan browser Notification bila diizinkan.
"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import type { AppNotification, NotificationType } from "@/lib/core/types";

const POLL_MS = 10_000;
const NS = "sofia.notif.";

function storeEnabled(): boolean {
  return localStorage.getItem(`${NS}enabled`) !== "0";
}
function storeTypes(): NotificationType[] {
  try {
    const t = JSON.parse(localStorage.getItem(`${NS}types`) || "");
    if (Array.isArray(t) && t.length) return t as NotificationType[];
  } catch { /* ignore */ }
  return ["TRADE", "SIGNAL", "RISK", "SYSTEM"];
}

const LEVEL_VARIANT: Record<string, "danger" | "warning" | "success" | "default"> = {
  ERROR: "danger",
  WARN: "warning",
  INFO: "success",
};

export function NotificationBell() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const firstLoad = useRef(true);
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(`/api/notifications?since=${firstLoad.current ? "0" : ""}`, { cache: "no-store" });
        const j = await r.json();
        if (!j.ok || !alive) return;
        const d = j.data;
        const list: AppNotification[] = Array.isArray(d.notifications) ? d.notifications : [];
        setUnread(Number(d.unread) || 0);
        setItems((prev) => {
          const byId = new Map(prev.map((n) => [n.id, n]));
          for (const n of list) byId.set(n.id, n);
          return Array.from(byId.values()).sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 50);
        });
        // Browser notification untuk item baru (user enable + izin granted + tipe aktif)
        const isFirst = firstLoad.current;
        const enabled = !isFirst && typeof window !== "undefined" && "Notification" in window ? storeEnabled() : false;
        const types = storeTypes();
        for (const n of list) {
          if (seen.current.has(n.id)) continue;
          seen.current.add(n.id);
          if (!enabled || !types.includes(n.type)) continue;
          if (window.Notification.permission !== "granted") continue;
          try {
            new window.Notification(n.title, { body: n.body, tag: n.id, icon: "/icon-192.png" });
          } catch { /* tidak didukung */ }
        }
        firstLoad.current = false;
      } catch { /* offline */ }
    };
    void load();
    const t = setInterval(load, POLL_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  async function markAll() {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      setUnread(0);
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch { /* ignore */ }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifikasi (${unread} belum dibaca)`}
        className="relative text-text-muted hover:text-text-primary p-2 rounded-btn hover:bg-surface-elevated transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 max-w-[90vw] rounded-xl border border-border bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <p className="text-sm font-semibold text-text-primary">Notifikasi</p>
              <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={markAll} disabled={!unread}>
                <CheckCheck className="h-3.5 w-3.5" /> Semua dibaca
              </Button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2 space-y-1.5">
              {items.length === 0 && <p className="px-2 py-4 text-sm text-text-muted">Belum ada notifikasi.</p>}
              {items.map((n) => (
                <div key={n.id} className={`rounded-lg border p-2 text-xs ${n.read ? "border-border opacity-70" : "border-primary/40 bg-primary/5"}`}>
                  <div className="flex items-center gap-2">
                    <Badge variant={LEVEL_VARIANT[n.level] || "default"}>{n.type}</Badge>
                    <span className="font-medium text-text-primary">{n.title}</span>
                    <span className="ml-auto shrink-0 text-text-muted">{formatDate(n.ts)}</span>
                  </div>
                  <p className="mt-1 text-text-secondary">{n.body}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}