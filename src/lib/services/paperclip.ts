// SOFIA 2.0 — Paperclip client contract (TASK-002 / PRD §12).
// Source of truth: organizations, agents, projects, goals, tasks, runs.
// Fase fondasi: kontrak + health. Endpoint bisnis penuh di TASK-004.
import { HttpServiceClient } from "./http-client";
import { getServerConfig } from "@/lib/config/server";
import type { ServiceCheckResult } from "./types";

export class PaperclipClient extends HttpServiceClient {
  constructor() {
    const cfg = getServerConfig();
    super({
      name: "paperclip",
      baseUrl: cfg.paperclip.baseUrl,
      apiKey: process.env.PAPERCLIP_API_KEY,
      healthPath: "/health",
    });
  }
  override async check(): Promise<ServiceCheckResult> {
    const cfg = getServerConfig();
    if (!cfg.paperclip.configured)
      return { status: "unconfigured", latencyMs: null, detail: "PAPERCLIP_BASE_URL belum dikonfigurasi" };
    return super.check();
  }
}
