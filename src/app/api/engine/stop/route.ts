import { getEngine } from "@/lib/core/engine";
import { ok, apiError, readJson } from "@/lib/core/api";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await readJson<{ reason?: string }>(req);
    getEngine().stop(body.reason || "manual");
    return ok({ state: "STOPPED" });
  } catch (e) {
    return apiError(e instanceof Error ? e.message : String(e), 500);
  }
}
