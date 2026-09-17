import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "http://localhost:54321";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "mock_service_key";

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async () => {
  try {
    // Fetch all active, unresolved reminders
    const { data: reminders, error } = await supabaseAdmin
      .from("reminders")
      .select("id, stage_at_stall, hours_inactive, message, consultant_id")
      .eq("is_resolved", false);

    if (error) throw error;

    console.log(`[Stall Digest Engine] Total unresolved SLA breaches: ${reminders?.length || 0}`);

    return new Response(
      JSON.stringify({
        success: true,
        breach_count: reminders?.length || 0,
        reminders,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
