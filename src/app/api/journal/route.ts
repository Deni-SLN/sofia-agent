import { getStore } from "@/lib/core/store";
import { buildPerformance } from "@/lib/core/performance";
import { ok } from "@/lib/core/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = getStore();
  return ok(s.journal.slice(0, 200), { count: s.journal.length });
}

export async function POST() {
  // Performance dihitung ulang dari jurnal — endpoint terpisah di /api/performance.
  // POST di sini disediakan untuk kompatibilitas: mengembalikan ringkasan terbaru.
  const s = getStore();
  return ok(buildPerformance(s.journal));
}
