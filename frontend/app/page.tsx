import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/supabase/types";

/**
 * Root route — redirects immediately based on auth state.
 * Middleware also handles this, but an explicit server-side redirect here
 * avoids a flash of the empty default page on first load.
 */
export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const profile = profileData as { role: UserRole } | null;

  switch (profile?.role) {
    case "consultant": redirect("/dashboard/consultant");
    case "admin":      redirect("/dashboard/admin");
    default:           redirect("/dashboard/student");
  }
}
