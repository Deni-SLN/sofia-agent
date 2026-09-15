// SOFIA 2.0 — 9Router gateway contract (TASK-002 / PRD §14, §17).
// SOFIA → abstraksi gateway → 9Router → provider/model.
import { HttpServiceClient } from "./http-client";
import { getServerConfig } from "@/lib/config/server";
import type { ServiceCheckResult } from "./types";

export class NineRouterClient extends HttpServiceClient {
  constructor() {
    const cfg = getServerConfig();
    super({
      name: "router",
      baseUrl: cfg.router9.baseUrl,
      apiKey: process.env.ROUTER_API_KEY,
      healthPath: "/health",
    });
  }
  override async check(): Promise<ServiceCheckResult> {
    const cfg = getServerConfig();
    if (!cfg.router9.configured)
      return { status: "unconfigured", latencyMs: null, detail: "ROUTER_BASE_URL belum dikonfigurasi" };
    return super.check();
  }
}
