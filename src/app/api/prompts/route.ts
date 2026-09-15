// AI Prompt Library API (PRD §7.12): GET/POST/PUT/DELETE.
import { getStore, upsertPrompt, removePrompt } from "@/lib/core/store";
import { ok, apiError, readJson } from "@/lib/core/api";
import { BUILTIN_PROMPTS, PROMPT_CATEGORIES } from "@/lib/core/prompts";
import type { SavedPrompt, PromptCategory } from "@/lib/core/prompts";
export const dynamic = "force-dynamic";

export async function GET() {
  const s = getStore();
  return ok({
    builtins: BUILTIN_PROMPTS,
    variables: ["symbol", "timeframe", "price", "indicators", "news", "portfolio"],
    categories: PROMPT_CATEGORIES,
    saved: s.prompts,
  });
}

export async function POST(req: Request) {
  const b = await readJson<{ id?: string; name?: string; category?: string; template?: string }>(req);
  const name = String(b.name || "").trim().slice(0, 60);
  const template = String(b.template || "").slice(0, 4000);
  const category = String(b.category || "CUSTOM").toUpperCase() as PromptCategory;
  if (!name) return apiError("nama prompt wajib", 400);
  if (!template) return apiError("template wajib", 400);
  if (!PROMPT_CATEGORIES.includes(category)) return apiError(`kategori tidak dikenal: ${category}`, 400);
  const now = new Date().toISOString();
  const p: SavedPrompt = { id: b.id || `pr-${Date.now()}`, name, category, template, createdAt: now, updatedAt: now };
  upsertPrompt(p);
  return ok(p);
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return apiError("parameter id wajib", 400);
  const done = removePrompt(id);
  if (!done) return apiError("Prompt tidak ditemukan", 404);
  return ok({ id, deleted: true });
}