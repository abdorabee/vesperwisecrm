import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/lib/supabase/types";
import { runWorkflowAction } from "@/lib/workflows/actions";
import {
  cooldownBlocksRefire,
  cooldownHoursFromConfig,
  stageIdFromConfig,
} from "@/lib/workflows/fire-once";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

type Db = SupabaseClient<Database>;

// send_email_template still sends through the signed-in mailbox helper.
// Everything else a scheduled workflow can do writes with the client passed
// in (the cron passes the service role) or with the service role directly.
export const CRON_SAFE_ACTION_TYPES = new Set([
  "change_stage",
  "add_tag",
  "enroll_sequence",
  "assign_round_robin",
  "reassign",
  "create_task",
  "notify_user",
]);

async function leadFireIsCoolingDown(
  supabase: Db,
  workflowId: string,
  leadId: string,
  cooldownHours: number | null,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("workflow_lead_fires")
    .select("fired_at")
    .eq("workflow_id", workflowId)
    .eq("lead_id", leadId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return cooldownBlocksRefire(data?.fired_at, cooldownHours);
}

async function recordFire(
  supabase: Db,
  accountId: string,
  workflowId: string,
  leadId: string,
): Promise<void> {
  const { error } = await supabase.from("workflow_lead_fires").upsert(
    {
      account_id: accountId,
      workflow_id: workflowId,
      lead_id: leadId,
      fired_at: new Date().toISOString(),
    },
    { onConflict: "workflow_id,lead_id" },
  );

  if (error) {
    throw new Error(error.message);
  }
}

async function runLeadWorkflow(
  supabase: Db,
  workflowRow: Tables<"workflows">,
  actions: Tables<"workflow_actions">[],
  leadId: string,
  unsupportedMessage: string,
): Promise<"triggered" | "failed" | "skipped"> {
  const triggerConfig = (workflowRow.trigger_config ?? {}) as Record<string, unknown>;
  const blocked = await leadFireIsCoolingDown(
    supabase,
    workflowRow.id,
    leadId,
    cooldownHoursFromConfig(triggerConfig),
  );
  if (blocked) {
    return "skipped";
  }

  const orderedActions = [...actions].sort((a, b) => a.step_number - b.step_number);

  try {
    for (const action of orderedActions) {
      if (!CRON_SAFE_ACTION_TYPES.has(action.action_type)) {
        throw new Error(unsupportedMessage.replace("%s", action.action_type));
      }
      await runWorkflowAction(supabase, workflowRow.account_id, leadId, action);
    }

    await recordFire(supabase, workflowRow.account_id, workflowRow.id, leadId);

    await supabase.from("activities").insert({
      account_id: workflowRow.account_id,
      lead_id: leadId,
      type: "workflow_triggered",
      payload: {
        workflow_id: workflowRow.id,
        workflow_name: workflowRow.name,
        status: "success",
      },
    });
    return "triggered";
  } catch (error) {
    await supabase.from("activities").insert({
      account_id: workflowRow.account_id,
      lead_id: leadId,
      type: "workflow_triggered",
      payload: {
        workflow_id: workflowRow.id,
        workflow_name: workflowRow.name,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
    return "failed";
  }
}

export async function processNoActivityWorkflows(
  supabase: Db,
  capableAccountIds: Set<string>,
): Promise<{ triggered: number; failed: number }> {
  const { data: workflows } = await supabase
    .from("workflows")
    .select("*, workflow_actions(*)")
    .eq("trigger_type", "no_activity_days")
    .eq("is_active", true);

  let triggered = 0;
  let failed = 0;

  for (const workflow of workflows ?? []) {
    const { workflow_actions: actions, ...workflowRow } = workflow as Tables<"workflows"> & {
      workflow_actions: Tables<"workflow_actions">[];
    };
    if (!capableAccountIds.has(workflowRow.account_id)) {
      continue;
    }

    const triggerConfig = (workflowRow.trigger_config ?? {}) as Record<string, unknown>;
    const days = Number(triggerConfig.days ?? 0);
    if (!days) {
      continue;
    }

    const cutoff = new Date(Date.now() - days * MS_PER_DAY);
    let leadQuery = supabase
      .from("leads")
      .select("id")
      .eq("account_id", workflowRow.account_id)
      .eq("status", "open")
      .is("deleted_at", null)
      .lt("created_at", cutoff.toISOString());

    const stageId = stageIdFromConfig(triggerConfig);
    if (stageId) {
      leadQuery = leadQuery.eq("pipeline_stage_id", stageId);
    }

    const { data: leads } = await leadQuery;

    for (const lead of leads ?? []) {
      const { data: recentActivity } = await supabase
        .from("activities")
        .select("id")
        .eq("lead_id", lead.id)
        .gte("created_at", cutoff.toISOString())
        .limit(1)
        .maybeSingle();

      if (recentActivity) {
        continue;
      }

      const outcome = await runLeadWorkflow(
        supabase,
        workflowRow,
        actions,
        lead.id,
        'Action type "%s" is not supported for no-activity workflows',
      );
      if (outcome === "triggered") triggered += 1;
      if (outcome === "failed") failed += 1;
    }
  }

  return { triggered, failed };
}

export async function processNoNextActionWorkflows(
  supabase: Db,
  capableAccountIds: Set<string>,
): Promise<{ triggered: number; failed: number }> {
  const { data: workflows } = await supabase
    .from("workflows")
    .select("*, workflow_actions(*)")
    .eq("trigger_type", "no_next_action")
    .eq("is_active", true);

  let triggered = 0;
  let failed = 0;

  for (const workflow of workflows ?? []) {
    const { workflow_actions: actions, ...workflowRow } = workflow as Tables<"workflows"> & {
      workflow_actions: Tables<"workflow_actions">[];
    };
    if (!capableAccountIds.has(workflowRow.account_id)) {
      continue;
    }

    const triggerConfig = (workflowRow.trigger_config ?? {}) as Record<string, unknown>;
    const hours = Number(triggerConfig.hours ?? 0);
    if (!hours) {
      continue;
    }

    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const { data: leads } = await supabase
      .from("leads")
      .select("id")
      .eq("account_id", workflowRow.account_id)
      .eq("status", "open")
      .is("deleted_at", null)
      .lt("created_at", cutoff.toISOString());

    for (const lead of leads ?? []) {
      const [{ data: openTask }, { data: activeEnrollment }] = await Promise.all([
        supabase
          .from("lead_tasks")
          .select("id")
          .eq("lead_id", lead.id)
          .is("completed_at", null)
          .limit(1)
          .maybeSingle(),
        supabase
          .from("lead_sequence_enrollments")
          .select("id")
          .eq("lead_id", lead.id)
          .eq("status", "active")
          .limit(1)
          .maybeSingle(),
      ]);

      if (openTask || activeEnrollment) {
        continue;
      }

      const outcome = await runLeadWorkflow(
        supabase,
        workflowRow,
        actions,
        lead.id,
        'Action type "%s" is not supported for no-next-action workflows',
      );
      if (outcome === "triggered") triggered += 1;
      if (outcome === "failed") failed += 1;
    }
  }

  return { triggered, failed };
}
