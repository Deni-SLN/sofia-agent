import { getEngine } from "@/lib/core/engine";
import { getStore } from "@/lib/core/store";
import { ok, apiError, readJson } from "@/lib/core/api";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await readJson<{ reason?: string }>(req);
    getEngine().emergencyStop(body.reason || "manual emergency stop");
    return ok({ state: getStore().engineState, halted: true });
  } catch (e) {
    return apiError(e instanceof Error ? e.message : String(e), 500);
  }
}
