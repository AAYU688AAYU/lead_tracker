import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/types";

// Routes that do not require authentication
const PUBLIC_ROUTES = [
  "/login",
  "/auth/callback",
  "/apply",   // public student intake form — no session required
  "/status",  // public application status lookup — no session required
];

// Routes that are only accessible to specific roles (checked after auth)
const ROLE_PREFIXES: Record<string, string[]> = {
  "/dashboard/student":    ["student"],
  "/dashboard/consultant": ["consultant"],
  "/dashboard/admin":      ["admin"],
};

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Create a Supabase client that can read/write the session cookie.
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session — primary purpose of middleware in @supabase/ssr.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // ── Public routes: let unauthenticated users through ─────────────────────
  const isPublic = PUBLIC_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + "/")
  );

  if (!user && !isPublic) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Redirect authenticated users away from /login ────────────────────────
  if (user && pathname === "/login") {
    const role = await getUserRole(supabase, user.id);
    return NextResponse.redirect(
      new URL(dashboardForRole(role), request.url)
    );
  }

  // ── Role-based route guard ────────────────────────────────────────────────
  if (user) {
    for (const [prefix, allowed] of Object.entries(ROLE_PREFIXES)) {
      if (pathname.startsWith(prefix)) {
        const role = await getUserRole(supabase, user.id);
        if (!allowed.includes(role ?? "")) {
          return NextResponse.redirect(
            new URL(dashboardForRole(role), request.url)
          );
        }
        break;
      }
    }
  }

  return response;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getUserRole(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  const row = data as { role: string } | null;
  return row?.role ?? null;
}

function dashboardForRole(role: string | null): string {
  switch (role) {
    case "consultant": return "/dashboard/consultant";
    case "admin":      return "/dashboard/admin";
    default:           return "/dashboard/student";
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.ico, sitemap.xml, robots.txt
     * - public assets
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
