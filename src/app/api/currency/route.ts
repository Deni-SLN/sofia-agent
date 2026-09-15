import { getUsdIdr } from "@/lib/core/currency";
import { ok } from "@/lib/core/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const cur = await getUsdIdr();
  return ok(cur);
}
