// ============================================================
// SOFIA 2.0 — Public/client-safe config (TASK-002)
// Hanya nilai non-rahasia yang boleh dibaca client.
// Secret tetap di server (lihat src/lib/config/server.ts).
// ============================================================

export function getPublicConfig() {
  return {
    appUrl:
      typeof process.env.NEXT_PUBLIC_APP_URL === "string"
        ? process.env.NEXT_PUBLIC_APP_URL
        : "http://localhost:3000",
  };
}
