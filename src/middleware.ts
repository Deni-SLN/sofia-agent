import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

// Auth guard penuh (PRD §9): bila env Supabase TERSEDIA, semua halaman
// /(app) dan API sensitif wajib session; tanpa env → mode demo terbuka.
// API publik (market data, health) tetap terbuka agar ticker tetap hidup.

function authEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

const PUBLIC_PAGES = new Set(["/", "/login", "/register"]);
const PUBLIC_API = [/^\/api\/health$/, /^\/api\/currency$/, /^\/api\/market\//, /^\/api\/news$/, /^\/api\/scanner$/];

function isPublicPage(p: string): boolean {
  if (PUBLIC_PAGES.has(p)) return true;
  if (p.startsWith("/manifest.json") || p.startsWith("/icon-") || p.startsWith("/icon.")) return true;
  return false;
}
function isPublicApi(p: string): boolean {
  return PUBLIC_API.some((re) => re.test(p));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!authEnabled()) {
    // Mode demo/dev tanpa Supabase: biarkan terbuka.
    return NextResponse.next();
  }

  let response = NextResponse.next({ request: { headers: request.headers } });
  let user: { id: string } | null = null;
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            request.cookies.set({ name, value, ...options });
            response = NextResponse.next({ request: { headers: request.headers } });
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            request.cookies.set({ name, value: "", ...options });
            response = NextResponse.next({ request: { headers: request.headers } });
            response.cookies.set({ name, value: "", ...options });
          },
        },
      }
    );
    const { data } = await supabase.auth.getUser();
    user = data.user ? { id: data.user.id } : null;
  } catch {
    // Supabase unreachable: gagal-tertutup untuk API sensitif, halaman diarahkan ke login.
    user = null;
  }

  if (pathname.startsWith("/api/")) {
    if (isPublicApi(pathname)) return response;
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized — login dulu" }, { status: 401 });
    }
    return response;
  }

  if (isPublicPage(pathname)) return response;
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
