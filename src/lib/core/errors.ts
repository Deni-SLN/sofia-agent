// ============================================================
// SOFIA 2.0 — Error taxonomy (TASK-002 / PRD §43, §65)
// Satu bentuk error untuk seluruh API: user-safe message + code +
// fallback hint, tanpa stack trace ke browser.
// Response lama { ok, data } TIDAK DIUBAH (kompatibilitas V1).
// ============================================================

import { NextResponse } from "next/server";

export type SofiaErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "SERVICE_UNAVAILABLE"
  | "GATEWAY_UNREACHABLE"
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "INTERNAL";

export interface SofiaErrorBody {
  ok: false;
  code: SofiaErrorCode;
  message: string;
  /** Hint fallback user-safe, mis. "Fallback: OpenRouter tersedia." */
  fallback?: string;
  /** Action label opsional untuk UI, mis. "[Use OpenRouter]". */
  action?: string;
  requestId?: string;
}

const STATUS: Record<SofiaErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_UNREACHABLE: 502,
  TIMEOUT: 504,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

/** User-safe message default per code (Indonesia, tanpa detail internal). */
const DEFAULT_MESSAGE: Record<SofiaErrorCode, string> = {
  BAD_REQUEST: "Permintaan tidak valid. Periksa input lalu coba lagi.",
  UNAUTHORIZED: "Sesi berakhir. Silakan login kembali.",
  FORBIDDEN: "Akses ditolak untuk operasi ini.",
  NOT_FOUND: "Data yang diminta tidak ditemukan.",
  SERVICE_UNAVAILABLE: "Layanan tidak tersedia saat ini. Coba lagi nanti.",
  GATEWAY_UNREACHABLE: "Gateway AI tidak dapat dijangkau saat ini.",
  TIMEOUT: "Permintaan memakan waktu terlalu lama. Coba lagi.",
  RATE_LIMITED: "Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.",
  INTERNAL: "Terjadi gangguan. Tim telah mencatat kejadian ini.",
};

export function errorResponse(
  code: SofiaErrorCode,
  opts?: { message?: string; fallback?: string; action?: string; requestId?: string }
): NextResponse {
  const body: SofiaErrorBody = {
    ok: false,
    code,
    message: opts?.message ?? DEFAULT_MESSAGE[code],
    ...(opts?.fallback ? { fallback: opts.fallback } : {}),
    ...(opts?.action ? { action: opts.action } : {}),
    ...(opts?.requestId ? { requestId: opts.requestId } : {}),
  };
  return NextResponse.json(body, { status: STATUS[code] });
}

/** Mapping helper: error koneksi fetch → GATEWAY_UNREACHABLE / TIMEOUT. */
export function toSofiaErrorCode(err: unknown): SofiaErrorCode {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err ?? "").toLowerCase();
  if (msg.includes("abort") || msg.includes("timeout") || msg.includes("timed out")) return "TIMEOUT";
  if (msg.includes("fetch failed") || msg.includes("econnrefused") || msg.includes("enotfound"))
    return "GATEWAY_UNREACHABLE";
  return "INTERNAL";
}
