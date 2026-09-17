import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/types";
import { getUserRole, getDashboardPathForRole } from "@/lib/auth/jwt-utils";

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
    // OPTIMIZATION: Use JWT claims to get role (no DB query)
    const role = await getUserRole(user, supabase);
    return NextResponse.redirect(
      new URL(getDashboardPathForRole(role), request.url)
    );
  }

  // ── Role-based route guard ────────────────────────────────────────────────
  if (user) {
    for (const [prefix, allowed] of Object.entries(ROLE_PREFIXES)) {
      if (pathname.startsWith(prefix)) {
        // OPTIMIZATION: Use JWT claims to get role (no DB query)
        const role = await getUserRole(user, supabase);
        if (!allowed.includes(role ?? "")) {
          return NextResponse.redirect(
            new URL(getDashboardPathForRole(role), request.url)
          );
        }
        break;
      }
    }
  }

  return response;
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTE: getUserRole() and getUserRoleFromDB() functions removed
// ─────────────────────────────────────────────────────────────────────────────
//
// OPTIMIZATION: JWT Claims Extraction (Phase 10 #7)
//
// The middleware now uses JWT custom claims instead of database queries:
// - PRIMARY: getUserRole() extracts role from user.user_metadata?.role (O(1))
// - FALLBACK: Only queries DB if JWT claims missing (rare, backwards-compatible)
//
// This eliminates the middleware database query bottleneck:
// - BEFORE: Every request required a DB query to profiles table
// - AFTER: JWT claims provide instant role information
//
// Benefits:
// 1. Reduced database load (one query removed from middleware)
// 2. Faster middleware execution (O(1) instead of O(log n) index lookup)
// 3. Better scalability (middleware is now mostly I/O bound, not DB bound)
// 4. Graceful fallback for edge cases (handles missing claims)
//
// Setup: Run migration 20260918000013_phase10_jwt_role_claims.sql
//        This creates database triggers to sync role to JWT claims on update.
// ─────────────────────────────────────────────────────────────────────────────

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
