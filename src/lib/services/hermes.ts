// SOFIA 2.0 — Hermes visibility via Paperclip (TASK-002 / PRD §13).
// Hermes TIDAK punya client langsung: status/task/heartbeat/error
// dibaca lewat workflow Paperclip. Jangan buat worker duplikat.
import type { ServiceCheckResult, ServiceClient } from "./types";
import { getServerConfig } from "@/lib/config/server";

export class HermesViaPaperclipClient implements ServiceClient {
  readonly name = "hermes";
  async check(): Promise<ServiceCheckResult> {
    const cfg = getServerConfig();
    if (!cfg.hermesVisibleViaPaperclip)
      return { status: "unconfigured", latencyMs: null, detail: "Hermes terlihat via Paperclip; PAPERCLIP_BASE_URL belum dikonfigurasi" };
    // Fondasi: laporkan "degraded-sedia" — visibility penuh di TASK-005.
    return { status: "degraded", latencyMs: null, detail: "Hermes visibility via Paperclip (TASK-005)" };
  }
}
