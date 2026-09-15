// SOFIA 2.0 — Aggregated services health (TASK-002 / PRD §42).
// ADITIF: /api/health lama TIDAK DIUBAH. Endpoint baru melaporkan
// 8 layanan: paperclip, hermes, router, openrouter, local_llm,
// n8n, database, redis. Selalu 200 agar dashboard degradasi
// graceful (§63): tiap layanan yang mati hanya tampil offline.
import { NextResponse } from "next/server";
import { checkAllServices, overallStatus } from "@/lib/services/registry";
import { logger } from "@/lib/core/logger";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  try {
    const services = await checkAllServices();
    const overall = overallStatus(services);
    const servicesMap: Record<string, string> = {};
    for (const s of services) servicesMap[s.name] = s.status;
    logger.info("health.services", {
      requestId,
      status: overall,
      services: servicesMap,
    });
    return NextResponse.json({
      status: overall,
      services: servicesMap,
      details: services,
      requestId,
    });
  } catch (err) {
    logger.error("health.services_failed", {
      requestId,
      errorCode: "INTERNAL",
      error: err instanceof Error ? err.message : String(err),
    });
    // Graceful: tetap 200 dengan status down agar dashboard tidak pecah.
    return NextResponse.json({ status: "down", services: {}, details: [], requestId });
  }
}
