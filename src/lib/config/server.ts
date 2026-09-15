// ============================================================
// SOFIA 2.0 — Typed server configuration (TASK-002 / PRD §37, §38)
// - Server-only: file ini TIDAK BOLEH diimpor dari client component.
// - Tidak ada NEXT_PUBLIC_* di sini. Secret tidak pernah ke browser.
// - Semua bacaan env terpusat agar integrasi Paperclip/Hermes/9Router/
//   OpenRouter/Local LLM/n8n/PostgreSQL/Redis punya satu sumber kebenaran.
// ============================================================

export interface SofiaServiceEndpoint {
  baseUrl: string;
  apiKeyPresent: boolean;
  configured: boolean;
}

export interface SofiaConfig {
  nodeEnv: string;
  appBaseUrl: string;
  authSecretPresent: boolean;
  encryptionKeyPresent: boolean;
  paperclip: SofiaServiceEndpoint;
  router9: SofiaServiceEndpoint; // 9Router gateway (PRD §14, §17)
  openrouter: SofiaServiceEndpoint;
  localLlm: SofiaServiceEndpoint;
  n8n: SofiaServiceEndpoint;
  postgres: { urlPresent: boolean; configured: boolean };
  redis: { urlPresent: boolean; configured: boolean };
  hermesVisibleViaPaperclip: boolean;
}

function nonEmpty(v: string | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

function endpoint(baseUrl: string | undefined, apiKey: string | undefined): SofiaServiceEndpoint {
  const hasUrl = nonEmpty(baseUrl);
  const hasKey = nonEmpty(apiKey);
  return { baseUrl: (baseUrl ?? "").trim(), apiKeyPresent: hasKey, configured: hasUrl };
}

let cached: SofiaConfig | null = null;

/** Baca konfigurasi server. Aman dipanggil berulang (di-cache per proses). */
export function getServerConfig(): SofiaConfig {
  if (cached) return cached;
  const nodeEnv = process.env.NODE_ENV ?? "development";
  cached = {
    nodeEnv,
    appBaseUrl: (process.env.SOFIA_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").trim(),
    authSecretPresent: nonEmpty(process.env.AUTH_SECRET),
    encryptionKeyPresent: nonEmpty(process.env.ENCRYPTION_KEY),
    paperclip: endpoint(process.env.PAPERCLIP_BASE_URL, process.env.PAPERCLIP_API_KEY),
    router9: endpoint(process.env.ROUTER_BASE_URL, process.env.ROUTER_API_KEY),
    openrouter: endpoint("https://openrouter.ai/api/v1", process.env.OPENROUTER_API_KEY),
    localLlm: endpoint(process.env.LOCAL_LLM_BASE_URL, undefined),
    n8n: endpoint(process.env.N8N_BASE_URL, process.env.N8N_API_KEY),
    postgres: {
      urlPresent: nonEmpty(process.env.DATABASE_URL),
      configured: nonEmpty(process.env.DATABASE_URL),
    },
    redis: {
      urlPresent: nonEmpty(process.env.REDIS_URL),
      configured: nonEmpty(process.env.REDIS_URL),
    },
    // Hermes dijangkau lewat workflow Paperclip (PRD §13) — tidak ada base URL sendiri.
    hermesVisibleViaPaperclip: nonEmpty(process.env.PAPERCLIP_BASE_URL),
  };
  return cached;
}

/** Daftar env server-only yang TIDAK BOLEH diimpor/dibaca dari client bundle. */
export const SERVER_ONLY_ENV_KEYS = [
  "DATABASE_URL",
  "REDIS_URL",
  "PAPERCLIP_API_KEY",
  "ROUTER_API_KEY",
  "OPENROUTER_API_KEY",
  "N8N_API_KEY",
  "AUTH_SECRET",
  "ENCRYPTION_KEY",
] as const;
