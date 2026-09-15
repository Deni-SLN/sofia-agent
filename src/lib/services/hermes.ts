// SOFIA 2.0 — Hermes visibility via Paperclip (TASK-002 / PRD §13).
// Hermes TIDAK punya client langsung: status/task/heartbeat/error
// dibaca lewat workflow Paperclip. Jangan buat worker duplikat.
import type { ServiceCheckResult, ServiceClient } from "./types";
import { pendingIntegration } from "./types";
import { getServerConfig } from "@/lib/config/server";

export class HermesViaPaperclipClient implements ServiceClient {
  readonly name = "hermes";
  readonly tier = "required" as const;
  async check(): Promise<ServiceCheckResult> {
    const cfg = getServerConfig();
    if (!cfg.hermesVisibleViaPaperclip)
      return { status: "unconfigured", latencyMs: null, detail: "Hermes terlihat via Paperclip; PAPERCLIP_BASE_URL belum dikonfigurasi" };
    // TASK-003.5: JANGAN memalsukan health. Sampai TASK-005 menyediakan
    // kontrak (agent status, current task, last heartbeat, last run,
    // last error via Paperclip), Hermes dilaporkan "pending" — netral
    // untuk overall health, bukan "degraded" semu.
    return pendingIntegration("Integrasi Hermes belum dilakukan (TASK-005) — status/heartbeat via Paperclip menyusul");
  }
}
