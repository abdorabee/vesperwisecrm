"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdminAccountId } from "@/lib/supabase/account";
import {
  workflowSchema,
  type WorkflowActionInput,
  type WorkflowInput,
} from "@/lib/validations/workflow";
import type { Json } from "@/lib/supabase/types";

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

  let id = workflowId;

  if (id) {
    const { error } = await supabase
      .from("workflows")
      .update({
        name: data.name,
        trigger_type: data.triggerType,
        trigger_config: triggerConfig,
        is_active: data.isActive,
      })
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    const { error: deleteError } = await supabase
      .from("workflow_actions")
      .delete()
      .eq("workflow_id", id);

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
  const supabase = await createClient();

  const { error } = await supabase
    .from("workflows")
    .delete()
    .eq("id", workflowId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/workflows");
}

export async function toggleWorkflowActive(
  workflowId: string,
  isActive: boolean,
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("workflows")
    .update({ is_active: isActive })
    .eq("id", workflowId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/workflows");
}
