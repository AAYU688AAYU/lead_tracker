import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

/**
 * Phase 9: Auto-Response Edge Function
 * 
 * Triggered by: Database Webhook on leads table INSERT
 * 
 * Responsibilities:
 * 1. Verify webhook signature (HMAC-SHA256)
 * 2. Fetch student profile details
 * 3. Send parallel: HTML Email (Resend) + WhatsApp (Twilio)
 * 4. Log results to communication_logs
 * 
 * Error Handling:
 * - Try/catch around external API calls
 * - Log failures without cascading
 * - Return HTTP 200 on partial success
 */

interface WebhookPayload {
  type: string;
  record?: {
    id: string;
    student_id: string;
    reference_code: string;
    program_id: string;
    created_at: string;
  };
}

interface StudentProfile {
  id: string;
  email: string;
  full_name: string;
  phone: string;
}

interface CommunicationLog {
  lead_id: string;
  channel: string;
  recipient: string;
  content_snippet: string;
  status: "DELIVERED" | "FAILED";
  external_message_id?: string;
}

// Helper: Verify webhook signature
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = createHmac("sha256", secret);
  hmac.update(payload);
  const computedSignature = hmac.digest("hex");
  return computedSignature === signature;
}

// Helper: Fetch program name
async (
  supabase: ReturnType<typeof createClient>,
  programId: string
): Promise<string> => {
  const { data, error } = await supabase
    .from("programs")
    .select("name")
    .eq("id", programId)
    .single();

  if (error) {
    console.warn(`Failed to fetch program: ${error.message}`);
    return "Your program";
  }
  return data?.name || "Your program";
};

// Helper: Send email via Resend
async function sendEmailViaResend(
  studentEmail: string,
  studentName: string,
  portalUrl: string,
  referenceCode: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const emailContent = `
    <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; }
          .button { background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0; }
          .reference { background: #fff; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; font-family: monospace; }
          .footer { background: #f0f0f0; padding: 15px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Global Admissions Office</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${studentName}</strong>,</p>
            <p>Thank you for submitting your application dossier! We're excited to have you in our admissions pipeline.</p>
            
            <p><strong>Your Application Reference:</strong></p>
            <div class="reference">${referenceCode}</div>
            
            <p>An Educational Advisor will contact you within 24 hours to discuss your application and answer any questions you may have.</p>
            
            <p>In the meantime, you can track your application status and upload additional documents through your portal:</p>
            <a href="${portalUrl}" class="button">Access Your Portal</a>
            
            <p><strong>What's Next?</strong></p>
            <ul>
              <li>Review your submitted documents in the portal</li>
              <li>Prepare for your initial consultation with our advisor</li>
              <li>Watch for notifications about next steps</li>
            </ul>
            
            <p>If you have any immediate questions, please reply to this email.</p>
            
            <p>Best regards,<br><strong>Global Admissions Office</strong></p>
          </div>
          <div class="footer">
            <p>© Global Admissions Office. All rights reserved.</p>
            <p>This is an automated message. Please do not reply with sensitive information.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: `Global Admissions Office <admissions@apexcrm.com>`,
        to: studentEmail,
        subject: `Application Dossier Received – Welcome, ${studentName}`,
        html: emailContent,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error("Resend email error:", error);
    return { success: false, error: error.message };
  }
}

// Helper: Send WhatsApp via Twilio
async function sendWhatsAppViaTwilio(
  studentPhone: string,
  studentName: string,
  targetCountry: string,
  referenceCode: string,
  portalUrl: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const twilioPhoneNumber = Deno.env.get("TWILIO_WHATSAPP_NUMBER");
  const templateSid = Deno.env.get("TWILIO_WHATSAPP_TEMPLATE_SID");

  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber || !templateSid) {
    return {
      success: false,
      error: "Twilio credentials or template SID not configured",
    };
  }

  try {
    // Format phone number for Twilio (add country code if needed)
    const formattedPhone = studentPhone.startsWith("+")
      ? studentPhone
      : `+${studentPhone}`;

    const params = new URLSearchParams({
      From: `whatsapp:${twilioPhoneNumber}`,
      To: `whatsapp:${formattedPhone}`,
      ContentSid: templateSid,
      ContentVariables: JSON.stringify({
        "1": studentName,
        "2": targetCountry,
        "3": referenceCode.substring(0, 8),
        "4": portalUrl,
      }),
    });

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
        },
        body: params.toString(),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Twilio API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    return { success: true, messageId: data.sid };
  } catch (error) {
    console.error("Twilio WhatsApp error:", error);
    return { success: false, error: error.message };
  }
}

// Helper: Log communication result
async function logCommunication(
  supabase: ReturnType<typeof createClient>,
  log: CommunicationLog
): Promise<void> {
  const { error } = await supabase
    .from("communication_logs")
    .insert({
      lead_id: log.lead_id,
      channel: log.channel,
      actor_id: null, // system-generated
      summary: `${log.status}: ${log.content_snippet}`,
      external_message_id: log.external_message_id || null,
      status: log.status === "DELIVERED" ? "sent" : "failed",
    });

  if (error) {
    console.error(`Failed to log ${log.channel} communication:`, error);
  }
}

serve(async (req: Request) => {
  try {
    // 1. Verify webhook signature
    const webhookSecret = Deno.env.get("SUPABASE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error("SUPABASE_WEBHOOK_SECRET not configured");
      return new Response("Webhook secret not configured", { status: 500 });
    }

    const payload = await req.text();
    const signature = req.headers.get("x-supabase-signature");

    if (!signature || !verifyWebhookSignature(payload, signature, webhookSecret)) {
      console.error("Webhook signature verification failed");
      return new Response("Signature verification failed", { status: 401 });
    }

    const body: WebhookPayload = JSON.parse(payload);

    // Only process INSERT events
    if (body.type !== "INSERT" || !body.record) {
      return new Response("OK", { status: 200 });
    }

    const { id: leadId, student_id, reference_code, program_id } = body.record;

    // 2. Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Fetch student profile
    const { data: student, error: studentError } = await supabase
      .from("profiles")
      .select("id, email, full_name, phone")
      .eq("id", student_id)
      .single();

    if (studentError || !student) {
      console.error("Failed to fetch student profile:", studentError);
      return new Response(
        JSON.stringify({ error: "Student profile not found" }),
        { status: 404 }
      );
    }

    // 4. Fetch program name
    const { data: program } = await supabase
      .from("programs")
      .select("name, universities(country)")
      .eq("id", program_id)
      .single();

    const programName = program?.name || "Your program";
    const targetCountry = (program?.universities as any)?.country || "your target country";

    // 5. Generate portal URL
    const portalUrl = `${Deno.env.get("NEXT_PUBLIC_APP_URL") || "https://app.apexcrm.com"}/portal/student/${student_id}`;

    // 6. Parallel execution: Send email and WhatsApp
    const [emailResult, whatsappResult] = await Promise.all([
      sendEmailViaResend(
        student.email,
        student.full_name,
        portalUrl,
        reference_code
      ),
      sendWhatsAppViaTwilio(
        student.phone,
        student.full_name,
        targetCountry,
        reference_code,
        portalUrl
      ),
    ]);

    // 7. Log results to communication_logs
    const emailStatus = emailResult.success ? "DELIVERED" : "FAILED";
    const whatsappStatus = whatsappResult.success ? "DELIVERED" : "FAILED";

    await Promise.all([
      logCommunication(supabase, {
        lead_id: leadId,
        channel: "email",
        recipient: student.email,
        content_snippet: `Welcome dossier email sent to ${student.email}`,
        status: emailStatus,
        external_message_id: emailResult.messageId,
      }),
      logCommunication(supabase, {
        lead_id: leadId,
        channel: "whatsapp",
        recipient: student.phone,
        content_snippet: `Welcome WhatsApp sent to ${student.phone}`,
        status: whatsappStatus,
        external_message_id: whatsappResult.messageId,
      }),
    ]);

    // 8. Return response
    const responseBody = {
      status: "ok",
      lead_id: leadId,
      email_status: emailStatus,
      whatsapp_status: whatsappStatus,
      errors: {
        ...(emailResult.error && { email: emailResult.error }),
        ...(whatsappResult.error && { whatsapp: whatsappResult.error }),
      },
    };

    console.log("Auto-response completed:", responseBody);
    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unhandled error in auto-respond-lead:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
