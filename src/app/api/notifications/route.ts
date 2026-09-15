import { getStore, markNotificationsRead } from "@/lib/core/store";
import { ok } from "@/lib/core/api";
export const dynamic = "force-dynamic";

/** GET /api/notifications?since=<ISO> — notif baru sejak cursor + unread. */
export async function GET(req: Request) {
  const s = getStore();
  const url = new URL(req.url);
  const since = url.searchParams.get("since");
  const sinceTs = since ? new Date(since).getTime() : null;
  const all = s.notifications;
  const list = Number.isFinite(sinceTs)
    ? all.filter((n) => new Date(n.ts).getTime() > (sinceTs as number))
    : all.slice(0, 50);
  return ok({
    notifications: list,
    unread: all.filter((n) => !n.read).length,
    total: all.length,
  });
}

/** POST /api/notifications/read { ids?: string[] } — tandai dibaca (kosong = semua). */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({} as { ids?: string[] }));
  const ids = Array.isArray(b.ids) ? b.ids.map((x: unknown) => String(x)) : undefined;
  const marked = markNotificationsRead(ids);
  return ok({ marked }, { unread: getStore().notifications.filter((n) => !n.read).length });
}