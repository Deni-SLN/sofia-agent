import { getEngine } from "@/lib/core/engine";
import { ok } from "@/lib/core/api";

export const dynamic = "force-dynamic";

export async function POST() {
  getEngine().clearHalt();
  return ok({ halted: false, state: "STOPPED" });
}
