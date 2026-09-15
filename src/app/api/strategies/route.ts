// Strategy Builder API (PRD §7.6): GET list, POST simpan, DELETE hapus.
import { getStore, addStrategy, removeStrategy } from "@/lib/core/store";
import { ok, apiError, readJson } from "@/lib/core/api";
import { BUILTIN_STRATEGIES, getBuiltin, normalizeParams } from "@/lib/core/strategies";
export const dynamic = "force-dynamic";

export async function GET() {
  const s = getStore();
  return ok({
    builtins: BUILTIN_STRATEGIES.map((b) => ({ id: b.id, name: b.name, desc: b.desc, params: b.params })),
    saved: s.strategies,
  });
}

export async function POST(req: Request) {
  const b = await readJson<{ name?: string; type?: string; params?: Record<string, number> }>(req);
  const name = String(b.name || "").trim().slice(0, 40);
  const type = String(b.type || "").toUpperCase();
  if (!name) return apiError("nama strategi wajib", 400);
  const builtin = getBuiltin(type);
  if (!builtin) return apiError(`tipe strategi tidak dikenal: ${type}`, 400);
  const saved = {
    id: `strat-${Date.now()}`,
    name,
    type: builtin.id,
    params: normalizeParams(builtin, b.params),
    createdAt: new Date().toISOString(),
  };
  addStrategy(saved);
  return ok(saved);
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return apiError("parameter id wajib", 400);
  const done = removeStrategy(id);
  if (!done) return apiError("Strategi tidak ditemukan", 404);
  return ok({ id, deleted: true });
}