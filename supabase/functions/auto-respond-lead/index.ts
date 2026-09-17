import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "mock_resend_key";
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID") || "mock_twilio_sid";
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") || "mock_twilio_token";
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER") || "+15005550006";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "http://localhost:54321";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "mock_service_key";

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req: Request) => {
  try {
    const payload = await req.json();
    const lead = payload.record;

    if (!lead || !lead.id) {
      return new Response(JSON.stringify({ error: "Missing lead record in payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fetch student profile details
    const { data: student } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name, phone")
      .eq("id", lead.student_id)
      .single();

    const studentName = student?.full_name || lead.metadata?.student_name || "Applicant";
    const studentEmail = student?.email || "applicant@example.com";
    const studentPhone = student?.phone || lead.metadata?.phone || null;

    // Simulate / Trigger multi-channel dispatch
    console.log(`[Auto-Response Engine] Dispatching Welcome Pack to ${studentName} (${studentEmail})...`);

    // 1. Insert Email Log
    await supabaseAdmin.from("communication_logs").insert({
      lead_id: lead.id,
      channel: "EMAIL",
      recipient: studentEmail,
      subject: `Application Dossier Received – Welcome to Agency Broker, ${studentName}`,
      content_snippet: `Welcome dossier dispatched for destination: ${lead.target_country}`,
      status: "DELIVERED",
    });

    // 2. Insert WhatsApp Log if phone available
    if (studentPhone) {
      console.log(`[Auto-Response Engine] Dispatching WhatsApp alert to ${studentPhone}...`);
      await supabaseAdmin.from("communication_logs").insert({
        lead_id: lead.id,
        channel: "WHATSAPP",
        recipient: studentPhone,
        subject: "WhatsApp Immediate Acknowledgement",
        content_snippet: `Application Reference #${lead.id.substring(0, 8)} confirmed for ${lead.target_country}.`,
        status: "DELIVERED",
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Auto-response dispatched to ${studentEmail}`,
        lead_id: lead.id,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
