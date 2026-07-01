"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId, requireUserId } from "@/lib/supabase/account";
import { runTriggeredWorkflows } from "@/lib/workflows/engine";
import { newLeadSchema, type NewLeadInput } from "@/lib/validations/lead";

export async function createLead(
  input: NewLeadInput,
): Promise<{ leadId: string }> {
  const data = newLeadSchema.parse(input);
  const accountId = await requireAccountId();
  const userId = await requireUserId();
  const supabase = await createClient();

  let contactId: string;

  if (data.email) {
    const { data: existingContact } = await supabase
      .from("contacts")
      .select("id")
      .eq("account_id", accountId)
      .ilike("email", data.email)
      .is("deleted_at", null)
      .maybeSingle();

    if (existingContact) {
      contactId = existingContact.id;
    } else {
      const { data: newContact, error: contactError } = await supabase
        .from("contacts")
        .insert({
          account_id: accountId,
          first_name: data.firstName,
          last_name: data.lastName || null,
          email: data.email || null,
          phone: data.phone || null,
          company: data.company || null,
        })
        .select("id")
        .single();

      if (contactError || !newContact) {
        throw new Error(contactError?.message ?? "Failed to create contact");
      }
      contactId = newContact.id;
    }
  } else {
    const { data: newContact, error: contactError } = await supabase
      .from("contacts")
      .insert({
        account_id: accountId,
        first_name: data.firstName,
        last_name: data.lastName || null,
        phone: data.phone || null,
        company: data.company || null,
      })
      .select("id")
      .single();

    if (contactError || !newContact) {
      throw new Error(contactError?.message ?? "Failed to create contact");
    }
    contactId = newContact.id;
  }

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .insert({
      account_id: accountId,
      contact_id: contactId,
      pipeline_stage_id: data.pipelineStageId,
      title: data.title,
      value: data.value ? Number(data.value) : null,
    })
    .select("id")
    .single();

  if (leadError || !lead) {
    throw new Error(leadError?.message ?? "Failed to create lead");
  }

  await supabase.from("activities").insert({
    account_id: accountId,
    lead_id: lead.id,
    type: "lead_created",
    actor_user_id: userId,
    payload: { title: data.title },
  });

  await runTriggeredWorkflows(supabase, accountId, "lead_created", {
    leadId: lead.id,
  });

  revalidatePath("/pipeline");

  return { leadId: lead.id };
}

export async function updateLeadStage(
  leadId: string,
  newStageId: string,
): Promise<void> {
  const accountId = await requireAccountId();
  const userId = await requireUserId();
  const supabase = await createClient();

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("pipeline_stage_id, pipeline_stages:pipeline_stage_id(name)")
    .eq("id", leadId)
    .single();

  if (leadError || !lead) {
    throw new Error(leadError?.message ?? "Lead not found");
  }

  const { data: newStage, error: stageError } = await supabase
    .from("pipeline_stages")
    .select("name, is_won, is_lost")
    .eq("id", newStageId)
    .single();

  if (stageError || !newStage) {
    throw new Error(stageError?.message ?? "Stage not found");
  }

  const status = newStage.is_won ? "won" : newStage.is_lost ? "lost" : "open";

  const { error: updateError } = await supabase
    .from("leads")
    .update({ pipeline_stage_id: newStageId, status })
    .eq("id", leadId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const fromStageName = Array.isArray(lead.pipeline_stages)
    ? lead.pipeline_stages[0]?.name
    : (lead.pipeline_stages as { name: string } | null)?.name;

  await supabase.from("activities").insert({
    account_id: accountId,
    lead_id: leadId,
    type: "stage_changed",
    actor_user_id: userId,
    payload: { from_stage: fromStageName ?? null, to_stage: newStage.name },
  });

  await runTriggeredWorkflows(supabase, accountId, "stage_changed", {
    leadId,
    toStageId: newStageId,
  });

  revalidatePath("/pipeline");
  revalidatePath(`/leads/${leadId}`);
}
