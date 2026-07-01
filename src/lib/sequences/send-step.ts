import type { SupabaseClient } from "@supabase/supabase-js";
import { getResendClient } from "@/lib/resend/client";
import { sendSms } from "@/lib/sms/twilio";
import { resolveTemplate } from "@/lib/templates";
import type { Database } from "@/lib/supabase/types";

interface SendDueStepResult {
  completed: boolean;
}

// Self-contained: derives account/lead context from the enrollment row
// itself rather than relying on the cookie-bound requireAccountId()/
// requireUserId() helpers, so it works identically whether called with a
// user-session client (the manual "Send now" button) or a service-role
// client with no session at all (the cron processor).
export async function sendDueStep(
  supabase: SupabaseClient<Database>,
  enrollmentId: string,
  actorUserId: string | null,
): Promise<SendDueStepResult> {
  const { data: enrollment, error: enrollmentError } = await supabase
    .from("lead_sequence_enrollments")
    .select("*")
    .eq("id", enrollmentId)
    .single();

  if (enrollmentError || !enrollment) {
    throw new Error(enrollmentError?.message ?? "Enrollment not found");
  }

  const { data: step, error: stepError } = await supabase
    .from("sequence_steps")
    .select("*")
    .eq("sequence_id", enrollment.sequence_id)
    .eq("step_number", enrollment.current_step_number)
    .single();

  if (stepError || !step) {
    throw new Error(stepError?.message ?? "Step not found");
  }

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("contact:contact_id(first_name, last_name, email, phone)")
    .eq("id", enrollment.lead_id)
    .single();

  if (leadError || !lead) {
    throw new Error(leadError?.message ?? "Lead not found");
  }

  const contact = Array.isArray(lead.contact) ? lead.contact[0] : lead.contact;

  const subject = resolveTemplate(step.subject ?? "", contact);
  const body = resolveTemplate(step.body_template, contact);
  let communicationActivityId: string | null = null;

  if (step.channel === "email") {
    if (!contact?.email) {
      throw new Error("This lead's contact has no email address on file");
    }

    const fromAddress = process.env.RESEND_FROM_EMAIL;
    if (!fromAddress) {
      throw new Error(
        "RESEND_FROM_EMAIL is not configured. Add it to .env.local once your sending domain is verified.",
      );
    }

    const resend = getResendClient();
    const { data: sendResult, error: sendError } = await resend.emails.send({
      from: fromAddress,
      to: contact.email,
      subject,
      text: body,
    });

    if (sendError) {
      throw new Error(sendError.message);
    }

    const { data: emailActivity, error: emailActivityError } = await supabase
      .from("activities")
      .insert({
        account_id: enrollment.account_id,
        lead_id: enrollment.lead_id,
        type: "email_sent",
        actor_user_id: actorUserId,
        payload: {
          subject,
          to: contact.email,
          resend_message_id: sendResult?.id ?? null,
        },
      })
      .select("id")
      .single();

    if (emailActivityError) {
      throw new Error(emailActivityError.message);
    }

    communicationActivityId = emailActivity.id;
  } else if (step.channel === "sms") {
    if (!contact?.phone) {
      throw new Error("This lead's contact has no phone number on file");
    }

    const smsResult = await sendSms({ to: contact.phone, body });
    const { data: smsActivity, error: smsActivityError } = await supabase
      .from("activities")
      .insert({
        account_id: enrollment.account_id,
        lead_id: enrollment.lead_id,
        type: "sms_sent",
        actor_user_id: actorUserId,
        payload: {
          to: contact.phone,
          twilio_message_id: smsResult.messageId,
        },
      })
      .select("id")
      .single();

    if (smsActivityError) {
      throw new Error(smsActivityError.message);
    }

    communicationActivityId = smsActivity.id;
  } else {
    throw new Error(`Unsupported sequence channel: ${step.channel}`);
  }

  await supabase.from("sequence_step_sends").insert({
    account_id: enrollment.account_id,
    enrollment_id: enrollmentId,
    sequence_step_id: step.id,
    sent_by_user_id: actorUserId,
    activity_id: communicationActivityId,
  });

  const { data: nextStep } = await supabase
    .from("sequence_steps")
    .select("id, delay_days")
    .eq("sequence_id", enrollment.sequence_id)
    .eq("step_number", enrollment.current_step_number + 1)
    .maybeSingle();

  const completed = !nextStep;

  if (nextStep) {
    const nextDueAt = new Date(
      Date.now() + nextStep.delay_days * 24 * 60 * 60 * 1000,
    ).toISOString();

    await supabase
      .from("lead_sequence_enrollments")
      .update({
        current_step_number: enrollment.current_step_number + 1,
        next_step_due_at: nextDueAt,
      })
      .eq("id", enrollmentId);
  } else {
    await supabase
      .from("lead_sequence_enrollments")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        next_step_due_at: null,
      })
      .eq("id", enrollmentId);
  }

  await supabase.from("activities").insert({
    account_id: enrollment.account_id,
    lead_id: enrollment.lead_id,
    type: "sequence_step_sent",
    actor_user_id: actorUserId,
    payload: {
      channel: step.channel,
      step_number: enrollment.current_step_number,
    },
  });

  return { completed };
}
