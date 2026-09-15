// Settings — Security (PRD §7.17). V1: auth via Supabase, password change stub.
import { ok, apiError, readJson } from "@/lib/core/api";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const b = await readJson<{ current?: string; next?: string }>(req);
  if (!b.current || !b.next) return apiError("current & next wajib", 400);
  if (b.next.length < 8) return apiError("password baru min 8 karakter", 400);
  // V1: Supabase auth — operasi ini akan diarahkan ke Supabase jika env diset.
  // Stub aman: kembalikan sukses + hint.
  return ok({ changed: false, hint: "V1: ubah password via Supabase dashboard / reset email." });
}
