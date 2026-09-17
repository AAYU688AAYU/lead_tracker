"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/supabase/types";

export async function signIn(formData: FormData) {
  const email    = formData.get("email")    as string;
  const password = formData.get("password") as string;
  const next     = (formData.get("next") as string | null) ?? "";

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const params = new URLSearchParams({ error: error.message });
    if (next) params.set("next", next);
    redirect(`/login?${params.toString()}`);
  }

  // Fetch role to route correctly.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?error=session_missing");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const profile = profileData as { role: UserRole } | null;

  // Honour explicit `next` param if present, otherwise go to role dashboard.
  if (next && next.startsWith("/")) redirect(next);

  switch (profile?.role) {
    case "consultant": redirect("/dashboard/consultant");
    case "admin":      redirect("/dashboard/admin");
    default:           redirect("/dashboard/student");
  }
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
