"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId } from "@/lib/supabase/account";
import { getResendClient } from "@/lib/resend/client";
import { sendEmailSchema, type SendEmailInput } from "@/lib/validations/email";

export async function sendLeadEmail(
  leadId: string,
  input: SendEmailInput,
): Promise<void> {
  const data = sendEmailSchema.parse(input);
  const accountId = await requireAccountId();
  const supabase = await createClient();

  const {
    data: { user: actingUser },
  } = await supabase.auth.getUser();

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("contact:contact_id(email)")
    .eq("id", leadId)
    .single();

  if (leadError || !lead) {
    throw new Error(leadError?.message ?? "Lead not found");
  }

  const contact = Array.isArray(lead.contact) ? lead.contact[0] : lead.contact;

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
    subject: data.subject,
    text: data.body,
  });

  if (sendError) {
    throw new Error(sendError.message);
  }

  await supabase.from("activities").insert({
    account_id: accountId,
    lead_id: leadId,
    type: "email_sent",
    actor_user_id: actingUser?.id ?? null,
    payload: {
      subject: data.subject,
      to: contact.email,
      resend_message_id: sendResult?.id ?? null,
    },
  });

  revalidatePath(`/leads/${leadId}`);
}
