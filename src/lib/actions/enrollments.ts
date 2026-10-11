"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId, requireUserId } from "@/lib/supabase/account";
import { requireBillingCapability } from "@/lib/billing/access";
import { sendDueStep } from "@/lib/sequences/send-step";

export async function enrollLeadInSequence(
  leadId: string,
  sequenceId: string,
): Promise<void> {
  const accountId = await requireAccountId();
  await requireBillingCapability(accountId, "sequences");
  const userId = await requireUserId();
  const supabase = await createClient();

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id")
    .eq("id", leadId)
    .eq("account_id", accountId)
    .is("deleted_at", null)
    .maybeSingle();

  const { data: sequence, error: sequenceError } = await supabase
    .from("sequences")
    .select("name")
    .eq("id", sequenceId)
    .eq("account_id", accountId)
    .maybeSingle();

  if (leadError || sequenceError || !lead || !sequence) {
    throw new Error(
      leadError?.message ??
        sequenceError?.message ??
        "Lead and sequence must belong to this workspace",
    );
  }

  const { data: firstStep } = await supabase
    .from("sequence_steps")
    .select("delay_days")
    .eq("sequence_id", sequenceId)
    .eq("account_id", accountId)
    .eq("step_number", 1)
    .maybeSingle();

  const nextStepDueAt = firstStep
    ? new Date(
        Date.now() + firstStep.delay_days * 24 * 60 * 60 * 1000,
      ).toISOString()
    : null;

  const { error } = await supabase.from("lead_sequence_enrollments").insert({
    account_id: accountId,
    lead_id: leadId,
    sequence_id: sequenceId,
    next_step_due_at: nextStepDueAt,
  });

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("activities").insert({
    account_id: accountId,
    lead_id: leadId,
    type: "sequence_enrolled",
    actor_user_id: userId,
    payload: { sequence_name: sequence.name },
  });

  revalidatePath(`/leads/${leadId}`);
}

export async function sendCurrentStep(enrollmentId: string): Promise<void> {
  const accountId = await requireAccountId();
  await requireBillingCapability(accountId, "sequences");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: enrollment } = await supabase
    .from("lead_sequence_enrollments")
    .select("lead_id")
    .eq("id", enrollmentId)
    .eq("account_id", accountId)
    .maybeSingle();

  if (!enrollment) {
    throw new Error("Enrollment not found");
  }

  await sendDueStep(supabase, enrollmentId, user?.id ?? null);

  if (enrollment) {
    revalidatePath(`/leads/${enrollment.lead_id}`);
  }
}
