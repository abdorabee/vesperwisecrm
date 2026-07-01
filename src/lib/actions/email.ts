"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId } from "@/lib/supabase/account";
import { sendLeadFacingEmail } from "@/lib/email/send-lead-email";
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

  await sendLeadFacingEmail({
    supabase,
    accountId,
    leadId,
    to: contact.email,
    subject: data.subject,
    body: data.body,
    actorUserId: actingUser?.id ?? null,
  });

  revalidatePath(`/leads/${leadId}`);
}
