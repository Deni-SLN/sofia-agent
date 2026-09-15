// ============================================================
// SOFIA Trade — API response helpers (envelope konsisten)
// ============================================================

import { NextResponse } from "next/server";

export function ok<T>(data: T, meta?: Record<string, unknown>) {
  return NextResponse.json({ ok: true, data, ...(meta ? { meta } : {}) });
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}
