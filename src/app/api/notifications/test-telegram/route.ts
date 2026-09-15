// Notifications — test Telegram (PRD §7.16). Kirim pesan tes ke bot.
import { ok, apiError, readJson } from "@/lib/core/api";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const b = await readJson<{ botToken?: string; chatId?: string }>(req);
  const token = String(b.botToken || "").trim();
  const chatId = String(b.chatId || "").trim();
  if (!token || !chatId) return apiError("botToken & chatId wajib", 400);

  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: "✅ Tes notifikasi SOFIA Trade berhasil.", parse_mode: "HTML" }),
    });
    const j = (await r.json()) as { ok: boolean; description?: string };
    if (!j.ok) throw new Error(j.description || `HTTP ${r.status}`);
    return ok({ sent: true });
  } catch (e) {
    return apiError(`Telegram gagal: ${e instanceof Error ? e.message : String(e)}`, 502);
  }
}
