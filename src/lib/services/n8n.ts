// SOFIA 2.0 — n8n contract (TASK-002 / PRD §34).
// External: https://auton8n.dsln.my.id — HTTPS/API/webhook.
// n8n TIDAK boleh jadi middleman wajib tiap request SOFIA.
import { HttpServiceClient } from "./http-client";
import { getServerConfig } from "@/lib/config/server";
import type { ServiceCheckResult } from "./types";

export class N8nClient extends HttpServiceClient {
  constructor() {
    const cfg = getServerConfig();
    super({
      name: "n8n",
      baseUrl: cfg.n8n.baseUrl,
      apiKey: process.env.N8N_API_KEY,
      healthPath: "/healthz",
    });
  }
  override async check(): Promise<ServiceCheckResult> {
    const cfg = getServerConfig();
    if (!cfg.n8n.configured)
      return { status: "unconfigured", latencyMs: null, detail: "N8N_BASE_URL belum dikonfigurasi" };
    return super.check();
  }
}
