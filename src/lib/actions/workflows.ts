"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdminAccountId } from "@/lib/supabase/account";
import { requireBillingCapability } from "@/lib/billing/access";
import {
  workflowSchema,
  type WorkflowActionInput,
  type WorkflowInput,
} from "@/lib/validations/workflow";
import type { Json } from "@/lib/supabase/types";
import { requireRows } from "@/lib/supabase/require-rows";

function buildActionConfig(
  action: WorkflowActionInput,
): Record<string, Json> {
  switch (action.actionType) {
    case "send_email_template":
      return {
        subject: action.subject ?? null,
        bodyTemplate: action.bodyTemplate ?? null,
      };
    case "enroll_sequence":
      return { sequenceId: action.sequenceId ?? null };
    case "add_tag":
      return { tagId: action.tagId ?? null };
    case "assign_round_robin":
      return { groupId: action.groupId ?? null };
    case "change_stage":
      return { stageId: action.stageId ?? null };
    default:
      return {};
  }
}

export async function saveWorkflow(
  input: WorkflowInput,
  workflowId?: string,
): Promise<{ workflowId: string }> {
  const data = workflowSchema.parse(input);
  const accountId = await requireAdminAccountId();
  await requireBillingCapability(accountId, "workflows");
  const supabase = await createClient();

  const triggerConfig: Record<string, Json> = {};
  if (data.triggerType === "stage_changed" && data.triggerStageId) {
    triggerConfig.toStageId = data.triggerStageId;
  }
  if (data.triggerType === "tag_added" && data.triggerTagId) {
    triggerConfig.tagId = data.triggerTagId;
  }
  if (data.triggerType === "no_activity_days" && data.triggerDays) {
    triggerConfig.days = Number(data.triggerDays);
  }
  if (data.triggerType === "no_next_action" && data.triggerHours) {
    triggerConfig.hours = Number(data.triggerHours);
  }

  if (data.triggerStageId) {
    const { data: stage } = await supabase
      .from("pipeline_stages")
      .select("id")
      .eq("id", data.triggerStageId)
      .eq("account_id", accountId)
      .maybeSingle();
    if (!stage) throw new Error("Stage not found");
  }
  if (data.triggerTagId) {
    const { data: tag } = await supabase
      .from("tags")
      .select("id")
      .eq("id", data.triggerTagId)
      .eq("account_id", accountId)
      .maybeSingle();
    if (!tag) throw new Error("Tag not found");
  }

  for (const action of data.actions) {
    if (action.sequenceId) {
      const { data: sequence } = await supabase
        .from("sequences")
        .select("id")
        .eq("id", action.sequenceId)
        .eq("account_id", accountId)
        .maybeSingle();
      if (!sequence) throw new Error("Sequence not found");
    }
    if (action.tagId) {
      const { data: tag } = await supabase
        .from("tags")
        .select("id")
        .eq("id", action.tagId)
        .eq("account_id", accountId)
        .maybeSingle();
      if (!tag) throw new Error("Tag not found");
    }
    if (action.stageId) {
      const { data: stage } = await supabase
        .from("pipeline_stages")
        .select("id")
        .eq("id", action.stageId)
        .eq("account_id", accountId)
        .maybeSingle();
      if (!stage) throw new Error("Stage not found");
    }
    if (action.groupId) {
      const { data: group } = await supabase
        .from("lead_groups")
        .select("id")
        .eq("id", action.groupId)
        .eq("account_id", accountId)
        .maybeSingle();
      if (!group) throw new Error("Routing group not found");
    }
  }

  let id = workflowId;

  if (id) {
    const { data: updated, error } = await supabase
      .from("workflows")
      .update({
        name: data.name,
        trigger_type: data.triggerType,
        trigger_config: triggerConfig,
        is_active: data.isActive,
      })
      .eq("id", id)
      .eq("account_id", accountId)
      .select("id");
    requireRows(updated, error, "Workflow not found");

    const { error: deleteError } = await supabase
      .from("workflow_actions")
      .delete()
      .eq("workflow_id", id)
      .eq("account_id", accountId);

    if (deleteError) {
      throw new Error(deleteError.message);
    }
  } else {
    const { data: workflow, error } = await supabase
      .from("workflows")
      .insert({
        account_id: accountId,
        name: data.name,
        trigger_type: data.triggerType,
        trigger_config: triggerConfig,
        is_active: data.isActive,
      })
      .select("id")
      .single();

    if (error || !workflow) {
      throw new Error(error?.message ?? "Failed to create workflow");
    }
    id = workflow.id;
  }

  const actionsToInsert = data.actions.map((action, index) => ({
    account_id: accountId,
    workflow_id: id!,
    step_number: index + 1,
    action_type: action.actionType,
    action_config: buildActionConfig(action),
  }));

  const { error: actionsError } = await supabase
    .from("workflow_actions")
    .insert(actionsToInsert);

  if (actionsError) {
    throw new Error(actionsError.message);
  }

  revalidatePath("/workflows");
  revalidatePath(`/workflows/${id}`);

  return { workflowId: id! };
}

export async function deleteWorkflow(workflowId: string): Promise<void> {
  const accountId = await requireAdminAccountId();
  await requireBillingCapability(accountId, "workflows");
  const supabase = await createClient();

  const { data: deleted, error } = await supabase
    .from("workflows")
    .delete()
    .eq("id", workflowId)
    .eq("account_id", accountId)
    .select("id");
  requireRows(deleted, error, "Workflow not found");

  revalidatePath("/workflows");
}

export async function toggleWorkflowActive(
  workflowId: string,
  isActive: boolean,
): Promise<void> {
  const accountId = await requireAdminAccountId();
  await requireBillingCapability(accountId, "workflows");
  const supabase = await createClient();

  const { data: updated, error } = await supabase
    .from("workflows")
    .update({ is_active: isActive })
    .eq("id", workflowId)
    .eq("account_id", accountId)
    .select("id");
  requireRows(updated, error, "Workflow not found");

  revalidatePath("/workflows");
}
