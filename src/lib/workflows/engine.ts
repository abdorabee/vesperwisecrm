import { createClient } from "@/lib/supabase/server";
import { runWorkflowAction } from "@/lib/workflows/actions";
import type { Tables } from "@/lib/supabase/types";

export type SyncWorkflowTrigger = "lead_created" | "stage_changed" | "tag_added";

interface TriggerContext {
  leadId: string;
  toStageId?: string;
  tagId?: string;
}

function matchesTrigger(
  triggerType: SyncWorkflowTrigger,
  triggerConfig: Record<string, unknown>,
  context: TriggerContext,
): boolean {
  if (triggerType === "stage_changed" && triggerConfig.toStageId) {
    return triggerConfig.toStageId === context.toStageId;
  }
  if (triggerType === "tag_added" && triggerConfig.tagId) {
    return triggerConfig.tagId === context.tagId;
  }
  return true;
}

// Runs every active workflow matching triggerType for this account. Actions
// run through runWorkflowAction with skipWorkflows set on any action that
// could itself fire another trigger (change_stage, add_tag), so a workflow
// can never cascade into another workflow run.
export async function runTriggeredWorkflows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  accountId: string,
  triggerType: SyncWorkflowTrigger,
  context: TriggerContext,
): Promise<void> {
  const { data: workflows, error } = await supabase
    .from("workflows")
    .select("*, workflow_actions(*)")
    .eq("account_id", accountId)
    .eq("trigger_type", triggerType)
    .eq("is_active", true);

  if (error || !workflows) {
    return;
  }

  for (const workflow of workflows) {
    const { workflow_actions: actions, ...workflowRow } = workflow as Tables<"workflows"> & {
      workflow_actions: Tables<"workflow_actions">[];
    };

    const triggerConfig = (workflowRow.trigger_config ?? {}) as Record<
      string,
      unknown
    >;

    if (!matchesTrigger(triggerType, triggerConfig, context)) {
      continue;
    }

    try {
      const orderedActions = [...actions].sort(
        (a, b) => a.step_number - b.step_number,
      );
      for (const action of orderedActions) {
        await runWorkflowAction(supabase, accountId, context.leadId, action);
      }

      await supabase.from("activities").insert({
        account_id: accountId,
        lead_id: context.leadId,
        type: "workflow_triggered",
        payload: {
          workflow_id: workflowRow.id,
          workflow_name: workflowRow.name,
          status: "success",
        },
      });
    } catch (workflowError) {
      await supabase.from("activities").insert({
        account_id: accountId,
        lead_id: context.leadId,
        type: "workflow_triggered",
        payload: {
          workflow_id: workflowRow.id,
          workflow_name: workflowRow.name,
          status: "failed",
          error:
            workflowError instanceof Error
              ? workflowError.message
              : "Unknown error",
        },
      });
    }
  }
}
