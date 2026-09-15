import { getStore } from "@/lib/core/store";
import { buildPerformance } from "@/lib/core/performance";
import { ok } from "@/lib/core/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = getStore();
  return ok(buildPerformance(s.journal));
}
