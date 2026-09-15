// Settings — Exchange config (PRD §7.17). V1: paper mode, key via env.
import { ok, apiError, readJson } from "@/lib/core/api";
import { getStore } from "@/lib/core/store";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const b = await readJson<{ apiKey?: string; apiSecret?: string; testnet?: boolean; syncSec?: number; defaultPair?: string }>(req);
  const s = getStore();
  // V1: paper mode — key tidak dipakai, hanya disimpan sebagai metadata.
  if (b.syncSec !== undefined && (b.syncSec < 5 || b.syncSec > 300)) return apiError("syncSec 5-300", 400);
  if (b.defaultPair !== undefined) {
    const p = String(b.defaultPair).toUpperCase().trim();
    if (!/^[A-Z0-9]{4,20}$/.test(p)) return apiError("pair tidak valid", 400);
  }
  return ok({
    mode: s.mode,
    testnet: b.testnet ?? true,
    syncSec: b.syncSec ?? 30,
    defaultPair: b.defaultPair?.toUpperCase() ?? "BTCUSDT",
    note: "V1: key via .env server. Metadata tersimpan.",
  });
}
