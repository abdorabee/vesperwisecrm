"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId, requireUserId } from "@/lib/supabase/account";
import { requireBillingCapability } from "@/lib/billing/access";

function followUpTitle(subject: string | null, body: string): string {
  const fromSubject = subject?.trim();
  if (fromSubject) return fromSubject.slice(0, 160);
  const line = body.trim().split("\n")[0]?.trim();
  return (line || "Follow up").slice(0, 160);
}

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

export async function createFollowUpForCurrentStep(
  enrollmentId: string,
): Promise<void> {
  const accountId = await requireAccountId();
  await requireBillingCapability(accountId, "sequences");
  const userId = await requireUserId();
  const supabase = await createClient();

  const { data: enrollment, error: enrollmentError } = await supabase
    .from("lead_sequence_enrollments")
    .select("*")
    .eq("id", enrollmentId)
    .eq("account_id", accountId)
    .maybeSingle();

  if (enrollmentError || !enrollment) {
    throw new Error(enrollmentError?.message ?? "Enrollment not found");
  }

  const { data: step, error: stepError } = await supabase
    .from("sequence_steps")
    .select("*")
    .eq("sequence_id", enrollment.sequence_id)
    .eq("account_id", accountId)
    .eq("step_number", enrollment.current_step_number)
    .maybeSingle();

  if (stepError) {
    throw new Error(stepError.message);
  }
  if (!step) {
    throw new Error("This sequence step is no longer available");
  }

  const title = followUpTitle(step.subject, step.body_template);
  const dueAt = new Date(
    Date.now() + step.delay_days * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: task, error: taskError } = await supabase
    .from("lead_tasks")
    .insert({
      account_id: accountId,
      lead_id: enrollment.lead_id,
      title,
      description: step.body_template.trim() || null,
      due_at: dueAt,
      assigned_user_id: userId,
      created_by_user_id: userId,
    })
    .select("id")
    .single();

  if (taskError || !task) {
    throw new Error(taskError?.message ?? "Failed to create follow-up task");
  }

  await supabase.from("activities").insert({
    account_id: accountId,
    lead_id: enrollment.lead_id,
    type: "task_created",
    actor_user_id: userId,
    payload: {
      task_id: task.id,
      title,
      due_at: dueAt,
      sequence_step_number: enrollment.current_step_number,
    },
  });

  const { data: nextStep } = await supabase
    .from("sequence_steps")
    .select("id, delay_days")
    .eq("sequence_id", enrollment.sequence_id)
    .eq("account_id", accountId)
    .eq("step_number", enrollment.current_step_number + 1)
    .maybeSingle();

  if (nextStep) {
    const nextDueAt = new Date(
      Date.now() + nextStep.delay_days * 24 * 60 * 60 * 1000,
    ).toISOString();
    const { error: advanceError } = await supabase
      .from("lead_sequence_enrollments")
      .update({
        current_step_number: enrollment.current_step_number + 1,
        next_step_due_at: nextDueAt,
      })
      .eq("id", enrollmentId)
      .eq("account_id", accountId);
    if (advanceError) throw new Error(advanceError.message);
  } else {
    const { error: completeError } = await supabase
      .from("lead_sequence_enrollments")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        next_step_due_at: null,
      })
      .eq("id", enrollmentId)
      .eq("account_id", accountId);
    if (completeError) throw new Error(completeError.message);
  }

  revalidatePath(`/leads/${enrollment.lead_id}`);
  revalidatePath("/");
}
