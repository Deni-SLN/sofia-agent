// Telegram channel (PRD §7.16) — best-effort, env-driven, fire-and-forget.
// Set TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID di .env.local agar notif diteruskan.
let lastWarnAt = 0;

export type NotifType = "TRADE" | "ALERT" | "AI" | "SYSTEM" | "RISK" | "TRENDING" | "NEWS" | "INFO";

export function pushNotification(type: NotifType, title: string, body: string): void {
  // websocket notif diletakkan di sini bila diperlukan nanti.
  sendTelegram(title, body);
}


export function telegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

export function sendTelegram(title: string, body: string): void {
  if (!telegramConfigured()) return;
  const token = process.env.TELEGRAM_BOT_TOKEN as string;
  const chatId = process.env.TELEGRAM_CHAT_ID as string;
  void (async () => {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 8000);
    try {
      const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: ctl.signal,
        body: JSON.stringify({
          chat_id: chatId,
          text: `SOFIA: ${title}\n${body}`.slice(0, 3500),
          disable_web_page_preview: true,
        }),
      });
      if (!r.ok) {
        const now = Date.now();
        if (now - lastWarnAt > 60_000) {
          lastWarnAt = now;
          console.warn(`[telegram] kirim gagal: HTTP ${r.status}`);
        }
      }
    } catch {
      // offline / timeout — abaikan (best-effort)
    } finally {
      clearTimeout(timer);
    }
  })();
}