import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/supabase/types";

/**
 * Auth callback — exchanges the PKCE code for a session, then redirects
 * the user to their role-appropriate dashboard (or the `next` param if set).
 *
 * Supabase sends the user here after email confirmation or magic-link click.
 * URL shape: /auth/callback?code=<pkce_code>&next=/some/path
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? null;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Determine where to send the user after successful exchange.
      if (next && next.startsWith("/")) {
        return NextResponse.redirect(`${origin}${next}`);
      }

      // Fall back to role-based dashboard.
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        const profile = profileData as { role: UserRole } | null;
        const destination = dashboardForRole(profile?.role ?? null);
        return NextResponse.redirect(`${origin}${destination}`);
      }
    }
  }

  // Something went wrong — send to login with an error flag.
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}

function dashboardForRole(role: UserRole | null): string {
  switch (role) {
    case "consultant": return "/dashboard/consultant";
    case "admin":      return "/dashboard/admin";
    default:           return "/dashboard/student";
  }
}
