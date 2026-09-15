// SOFIA 2.0 — Local LLM contract (TASK-002 / PRD §16).
// Opsional (RTX 2060S, boleh offline). OpenAI-compatible base URL.
import { HttpServiceClient } from "./http-client";
import { getServerConfig } from "@/lib/config/server";
import type { ServiceCheckResult } from "./types";

export class LocalLlmClient extends HttpServiceClient {
  constructor() {
    const cfg = getServerConfig();
    super({
      name: "local_llm",
      baseUrl: cfg.localLlm.baseUrl,
      healthPath: "/models",
      timeoutMs: 3000,
    });
  }
  override async check(): Promise<ServiceCheckResult> {
    const cfg = getServerConfig();
    if (!cfg.localLlm.configured)
      return { status: "unconfigured", latencyMs: null, detail: "LOCAL_LLM_BASE_URL belum dikonfigurasi (opsional)" };
    return super.check();
  }
}
