import { createHash } from "crypto";
import { getStore, pushEvent } from "@/lib/core/store";
import { ok, apiError, readJson } from "@/lib/core/api";

export const dynamic = "force-dynamic";

// Autorisasi LIVE dua langkah (PRD §25): PIN + konfirmasi eksplisit.
// PIN pertama kali diset di sini, lalu wajib cocok. Hash SHA-256.
export async function POST(req: Request) {
  const body = await readJson<{ pin?: string; confirm?: boolean }>(req);
  const s = getStore();
  const pin = String(body.pin || "");
  if (pin.length < 4) return apiError("PIN minimal 4 karakter", 400);
  if (body.confirm !== true) return apiError("Konfirmasi eksplisit (confirm: true) wajib", 400);

  const hash = createHash("sha256").update(pin).digest("hex");
  if (!s.livePinHash) {
    s.livePinHash = hash;
    s.liveUnlocked = true;
    pushEvent("WARN", "AUTH", "PIN LIVE dibuat — mode LIVE di-unlock (tetap diblokir di V1)");
    return ok({ liveUnlocked: true, firstTime: true });
  }
  if (s.livePinHash !== hash) {
    pushEvent("WARN", "AUTH", "Percobaan unlock LIVE gagal (PIN salah)");
    return apiError("PIN salah", 401);
  }
  s.liveUnlocked = true;
  pushEvent("WARN", "AUTH", "Mode LIVE di-unlock (tetap diblokir di V1)");
  return ok({ liveUnlocked: true, firstTime: false });
}
