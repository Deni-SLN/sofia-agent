// ============================================================
// SOFIA 2.0 — HTTP service base (TASK-002)
// typed fetch dengan timeout + envelope hasil yang tidak throw.
// Dipakai Paperclip / 9Router / OpenRouter / Local LLM / n8n.
// ============================================================

import type { ServiceCheckResult, ServiceClient } from "./types";

export interface HttpServiceOptions {
  name: string;
  baseUrl: string;
  apiKey?: string;
  timeoutMs?: number;
  /** Path relatif untuk health check, mis. "/health" atau "/api/health". */
  healthPath?: string;
  /** Header tambahan non-rahasia. */
  headers?: Record<string, string>;
}

export class HttpServiceClient implements ServiceClient {
  readonly name: string;
  protected readonly baseUrl: string;
  protected readonly apiKey?: string;
  protected readonly timeoutMs: number;
  protected readonly healthPath: string;
  protected readonly extraHeaders: Record<string, string>;

  constructor(opts: HttpServiceOptions) {
    this.name = opts.name;
    this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
    this.apiKey = opts.apiKey;
    this.timeoutMs = opts.timeoutMs ?? 5000;
    this.healthPath = opts.healthPath ?? "/health";
    this.extraHeaders = opts.headers ?? {};
  }

  protected headers(): Record<string, string> {
    const h: Record<string, string> = { "content-type": "application/json", ...this.extraHeaders };
    if (this.apiKey) h.authorization = `Bearer ${this.apiKey}`;
    return h;
  }

  protected async request<T>(path: string, init?: RequestInit): Promise<T> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: { ...this.headers(), ...(init?.headers ?? {}) },
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`${this.name} HTTP ${res.status}`);
      return (await res.json()) as T;
    } finally {
      clearTimeout(t);
    }
  }

  async check(): Promise<ServiceCheckResult> {
    if (!this.baseUrl) return { status: "unconfigured", latencyMs: null, detail: `${this.name} base URL belum dikonfigurasi` };
    const start = Date.now();
    try {
      await this.request(this.healthPath, { method: "GET" });
      return { status: "online", latencyMs: Date.now() - start };
    } catch (err) {
      return {
        status: "offline",
        latencyMs: Date.now() - start,
        detail: err instanceof Error ? err.message : "unreachable",
      };
    }
  }
}
