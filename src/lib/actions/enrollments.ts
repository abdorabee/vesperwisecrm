"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId, requireUserId } from "@/lib/supabase/account";
import { sendDueStep } from "@/lib/sequences/send-step";

export async function enrollLeadInSequence(
  leadId: string,
  sequenceId: string,
): Promise<void> {
  const accountId = await requireAccountId();
  const userId = await requireUserId();
  const supabase = await createClient();

  const { data: sequence, error: sequenceError } = await supabase
    .from("sequences")
    .select("name")
    .eq("id", sequenceId)
    .single();

  if (sequenceError || !sequence) {
    throw new Error(sequenceError?.message ?? "Sequence not found");
  }

  const { data: firstStep } = await supabase
    .from("sequence_steps")
    .select("delay_days")
    .eq("sequence_id", sequenceId)
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
  await requireAccountId();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: enrollment } = await supabase
    .from("lead_sequence_enrollments")
    .select("lead_id")
    .eq("id", enrollmentId)
    .single();

  await sendDueStep(supabase, enrollmentId, user?.id ?? null);

  if (enrollment) {
    revalidatePath(`/leads/${enrollment.lead_id}`);
  }
}
