import { ok, readJson } from "@/lib/core/api";
import { aiChat, routerStatus } from "@/lib/core/ai-router";
import { getRouterState } from "@/lib/core/ai-store";
import { buildContext, deterministic } from "@/lib/core/sofia-fallback";

export const dynamic = "force-dynamic";

const SYSTEM = [
  "Kamu SOFIA Manager, asisten paper-trading crypto Indonesia, ringkas (<=150 kata).",
  "KONTEKS DATA adalah satu-satunya sumber kebenaran.",
  "JANGAN mengarang angka: hanya pakai angka dari KONTEKS.",
  "Jika data kosong, katakan terus terang + langkah berikut.",
].join("\n");

export async function GET() {
  const st = routerStatus();
  return ok({ router: st, deterministic: st.configured.length === 0 });
}

export async function POST(req: Request) {
  const body = await readJson<{ message?: string }>(req);
  const raw = String(body.message || "").trim().slice(0, 1000);
  if (!raw)
    return ok({ reply: "Halo! Tanya portfolio, posisi, risiko, performa, atau sinyal.", llm: false, provider: null });
  const st = getRouterState();
  const byId = new Map(st.providers.map((p) => [p.id, p]));
  const ids = (st.taskRoutes.chat || []).filter((id) => {
    const p = byId.get(id);
    return p && p.active && process.env[p.apiKeyEnv];
  });
  if (!ids.length)
    return ok({
      reply: deterministic(raw.toLowerCase()) + "\n\n[deterministik — isi API key AI utk LLM]",
      llm: false,
      provider: null,
    });
  try {
    const r = await aiChat("chat", SYSTEM, `KONTEKS:\n${buildContext()}\n\nUSER:\n${raw}`);
    return ok({
      reply: r.reply,
      llm: true,
      provider: r.providerId,
      model: r.model,
      cached: r.cached,
      latencyMs: r.latencyMs,
      costUsd: r.costUsd,
    });
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    return ok({
      reply: deterministic(raw.toLowerCase()) + `\n\n[LLM gagal (${m.slice(0, 120)})]`,
      llm: false,
      provider: null,
    });
  }
}
