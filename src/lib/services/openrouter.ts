// SOFIA 2.0 — OpenRouter fallback contract (TASK-002 / PRD §15).
// Dipakai saat 9Router unreachable (urutan failover §18).
import { HttpServiceClient } from "./http-client";
import type { ServiceCheckResult } from "./types";

export class OpenRouterClient extends HttpServiceClient {
  constructor() {
    super({
      name: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
      // OpenRouter tidak punya /health publik → cek auth ringan via /models.
      healthPath: "/models",
      timeoutMs: 8000,
    });
  }
  override async check(): Promise<ServiceCheckResult> {
    if (!process.env.OPENROUTER_API_KEY)
      return { status: "unconfigured", latencyMs: null, detail: "OPENROUTER_API_KEY belum dikonfigurasi" };
    const r = await super.check();
    // 401 = reachable tapi key salah → offline dengan detail jelas.
    if (r.status === "offline" && r.detail?.includes("401"))
      return { ...r, detail: "OpenRouter reachable, API key tidak valid (401)" };
    return r;
  }
}
