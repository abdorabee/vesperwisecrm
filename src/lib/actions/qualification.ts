"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId, requireUserId } from "@/lib/supabase/account";
import { runTriggeredWorkflows } from "@/lib/workflows/engine";
import { createLeadRecord } from "@/lib/leads/create-lead";
import { assignLeadToGroup } from "@/lib/actions/groups";
import {
  callerIntakeSchema,
  rejectLeadSchema,
  requestLeadInfoSchema,
  type CallerIntakeFormInput,
  type RejectLeadInput,
  type RequestLeadInfoInput,
} from "@/lib/validations/lead";

const REQUIRED_TO_QUALIFY = [
  "motivation",
  "timeline",
  "asking_price",
  "occupancy_status",
  "condition",
] as const;

function optionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function optionalNumber(value: string | undefined): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export async function submitCallerLead(
  input: CallerIntakeFormInput,
): Promise<{ leadId: string }> {
  const data = callerIntakeSchema.parse(input);
  const accountId = await requireAccountId();
  const userId = await requireUserId();
  const supabase = await createClient();

  const contactName = data.firstName?.trim() || data.addressLine1.trim();

  const { leadId } = await createLeadRecord(supabase, {
    accountId,
    actorUserId: userId,
    submittedByUserId: userId,
    qualificationStatus: "submitted",
    title: `${contactName} — ${data.addressLine1.trim()}`,
    firstName: contactName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone,
    source: "Cold call intake",
    property: {
      addressLine1: data.addressLine1,
      addressLine2: data.addressLine2,
      city: data.city,
      state: data.state,
      postalCode: data.postalCode,
      condition: data.property.condition,
      updatesDone: data.property.updatesDone,
      updatesNeeded: data.property.updatesNeeded,
      occupancyStatus: data.property.occupancyStatus,
      tenantDurationRent: data.property.tenantDurationRent,
      askingPrice: optionalNumber(data.property.askingPrice),
      motivation: data.property.motivation,
      timeline: data.property.timeline,
      workNeeded: data.property.workNeeded,
      roofCondition: data.property.roofCondition,
      flooringCondition: data.property.flooringCondition,
      kitchenBathCondition: data.property.kitchenBathCondition,
      mortgage: data.property.mortgage,
      frameSidingCondition: data.property.frameSidingCondition,
      windowsCondition: data.property.windowsCondition,
      basementType: data.property.basementType,
      wallsCondition: data.property.wallsCondition,
      electricalPlumbingCondition: data.property.electricalPlumbingCondition,
      furnaceCondition: data.property.furnaceCondition,
      waterHeaterCondition: data.property.waterHeaterCondition,
      acCondition: data.property.acCondition,
      bedrooms: optionalNumber(data.property.bedrooms),
      bathrooms: optionalNumber(data.property.bathrooms),
      squareFeet: optionalNumber(data.property.squareFeet),
      followUpContact: data.property.followUpContact,
      notes: data.property.notes,
    },
  });

  await runTriggeredWorkflows(supabase, accountId, "lead_created", { leadId });

  revalidatePath("/queue");
  revalidatePath("/pipeline");

  return { leadId };
}

export async function qualifyLead(
  leadId: string,
  groupId?: string,
): Promise<void> {
  const accountId = await requireAccountId();
  const userId = await requireUserId();
  const supabase = await createClient();

  const { data: property } = await supabase
    .from("lead_properties")
    .select("motivation, timeline, asking_price, occupancy_status, condition")
    .eq("lead_id", leadId)
    .eq("account_id", accountId)
    .maybeSingle();

  const missing = REQUIRED_TO_QUALIFY.filter((field) => {
    const value = property?.[field as keyof typeof property];
    return value == null || value === "";
  });

  if (missing.length > 0) {
    throw new Error(
      `Add ${missing.join(", ")} before qualifying this lead`,
    );
  }

  const { error } = await supabase
    .from("leads")
    .update({
      qualification_status: "qualified",
      qualified_by_user_id: userId,
      qualified_at: new Date().toISOString(),
    })
    .eq("id", leadId)
    .eq("account_id", accountId);

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("activities").insert({
    account_id: accountId,
    lead_id: leadId,
    type: "lead_qualified",
    actor_user_id: userId,
    payload: {},
  });

  if (groupId) {
    await assignLeadToGroup(leadId, groupId);
  }

  revalidatePath("/queue");
  revalidatePath("/pipeline");
  revalidatePath(`/leads/${leadId}`);
}

export async function rejectLead(
  leadId: string,
  input: RejectLeadInput,
): Promise<void> {
  const data = rejectLeadSchema.parse(input);
  const accountId = await requireAccountId();
  const userId = await requireUserId();
  const supabase = await createClient();

  const { error } = await supabase
    .from("leads")
    .update({
      qualification_status: "rejected",
      rejection_reason: data.reason,
      status: "lost",
    })
    .eq("id", leadId)
    .eq("account_id", accountId);

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("activities").insert({
    account_id: accountId,
    lead_id: leadId,
    type: "lead_rejected",
    actor_user_id: userId,
    payload: { reason: data.reason },
  });

  revalidatePath("/queue");
  revalidatePath("/pipeline");
  revalidatePath(`/leads/${leadId}`);
}

export async function requestLeadInfo(
  leadId: string,
  input: RequestLeadInfoInput,
): Promise<void> {
  const data = requestLeadInfoSchema.parse(input);
  const accountId = await requireAccountId();
  const userId = await requireUserId();
  const supabase = await createClient();

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("submitted_by_user_id")
    .eq("id", leadId)
    .eq("account_id", accountId)
    .single();

  if (leadError || !lead) {
    throw new Error(leadError?.message ?? "Lead not found");
  }

  const { error } = await supabase
    .from("leads")
    .update({ qualification_status: "needs_info" })
    .eq("id", leadId)
    .eq("account_id", accountId);

  if (error) {
    throw new Error(error.message);
  }

  const dueAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { data: task, error: taskError } = await supabase
    .from("lead_tasks")
    .insert({
      account_id: accountId,
      lead_id: leadId,
      title: "Get missing info back to the lead manager",
      description: optionalText(data.note),
      due_at: dueAt,
      priority: "high",
      assigned_user_id: lead.submitted_by_user_id ?? userId,
      created_by_user_id: userId,
    })
    .select("id")
    .single();

  if (taskError || !task) {
    throw new Error(taskError?.message ?? "Failed to create follow-up task");
  }

  await supabase.from("activities").insert([
    {
      account_id: accountId,
      lead_id: leadId,
      type: "lead_needs_info",
      actor_user_id: userId,
      payload: { note: data.note },
    },
    {
      account_id: accountId,
      lead_id: leadId,
      type: "task_created",
      actor_user_id: userId,
      payload: { task_id: task.id, title: "Get missing info back to the lead manager", due_at: dueAt },
    },
  ]);

  revalidatePath("/queue");
  revalidatePath("/pipeline");
  revalidatePath(`/leads/${leadId}`);
}
