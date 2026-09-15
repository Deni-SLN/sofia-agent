import { getEngine } from "@/lib/core/engine";
import { ok, apiError, readJson } from "@/lib/core/api";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await readJson<{ mode?: string }>(req);
  const mode = (body.mode || "PAPER").toUpperCase();
  if (mode !== "PAPER" && mode !== "LIVE") {
    return apiError("mode harus PAPER atau LIVE", 400);
  }
  try {
    await getEngine().start(mode as "PAPER" | "LIVE");
    return ok({ state: "RUNNING", mode });
  } catch (e) {
    return apiError(e instanceof Error ? e.message : String(e), 409);
  }
}
