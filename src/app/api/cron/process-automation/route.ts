import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { sendDueStep } from "@/lib/sequences/send-step";
import { runWorkflowAction } from "@/lib/workflows/actions";
import type { Tables } from "@/lib/supabase/types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

async function processDueSequenceSteps(
  supabase: ReturnType<typeof createServiceRoleClient>,
): Promise<{ sent: number; failed: number }> {
  const { data: dueEnrollments } = await supabase
    .from("lead_sequence_enrollments")
    .select("id, account_id, lead_id")
    .eq("status", "active")
    .not("next_step_due_at", "is", null)
    .lte("next_step_due_at", new Date().toISOString());

  let sent = 0;
  let failed = 0;

  for (const enrollment of dueEnrollments ?? []) {
    try {
      await sendDueStep(supabase, enrollment.id, null);
      sent += 1;
    } catch (error) {
      failed += 1;
      await supabase.from("activities").insert({
        account_id: enrollment.account_id,
        lead_id: enrollment.lead_id,
        type: "sequence_step_sent",
        payload: {
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }
  }

  return { sent, failed };
}

// Only change_stage/add_tag are safe to run with no user session (they write
// directly with the service-role client). The other action types depend on
// cookie-session-bound helpers (requireAccountId/requireUserId) and are not
// yet supported for the no-activity-days trigger — recorded as a failed
// workflow run instead of silently skipped.
const CRON_SAFE_ACTION_TYPES = new Set(["change_stage", "add_tag"]);

async function processNoActivityWorkflows(
  supabase: ReturnType<typeof createServiceRoleClient>,
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

    const triggerConfig = (workflowRow.trigger_config ?? {}) as Record<
      string,
      unknown
    >;
    const days = Number(triggerConfig.days ?? 0);
    if (!days) {
      continue;
    }

    const cutoff = new Date(Date.now() - days * MS_PER_DAY);

    const { data: leads } = await supabase
      .from("leads")
      .select("id, created_at")
      .eq("account_id", workflowRow.account_id)
      .eq("status", "open")
      .is("deleted_at", null)
      .lt("created_at", cutoff.toISOString());

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

      const orderedActions = [...actions].sort(
        (a, b) => a.step_number - b.step_number,
      );

      try {
        for (const action of orderedActions) {
          if (!CRON_SAFE_ACTION_TYPES.has(action.action_type)) {
            throw new Error(
              `Action type "${action.action_type}" requires a signed-in context and isn't supported for no-activity-days workflows yet`,
            );
          }
          await runWorkflowAction(supabase, workflowRow.account_id, lead.id, action);
        }

        await supabase.from("activities").insert({
          account_id: workflowRow.account_id,
          lead_id: lead.id,
          type: "workflow_triggered",
          payload: {
            workflow_id: workflowRow.id,
            workflow_name: workflowRow.name,
            status: "success",
          },
        });
        triggered += 1;
      } catch (error) {
        await supabase.from("activities").insert({
          account_id: workflowRow.account_id,
          lead_id: lead.id,
          type: "workflow_triggered",
          payload: {
            workflow_id: workflowRow.id,
            workflow_name: workflowRow.name,
            status: "failed",
            error: error instanceof Error ? error.message : "Unknown error",
          },
        });
        failed += 1;
      }
    }
  }

  return { triggered, failed };
}

// "No lead left behind": every open lead should carry a next action (an open
// task or an active sequence enrollment). This runs the same way as
// no_activity_days but checks for the *absence* of scheduled follow-up
// instead of the absence of recent activity, and only fires for leads older
// than trigger_config.hours.
async function processNoNextActionWorkflows(
  supabase: ReturnType<typeof createServiceRoleClient>,
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

    const triggerConfig = (workflowRow.trigger_config ?? {}) as Record<
      string,
      unknown
    >;
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

      const orderedActions = [...actions].sort(
        (a, b) => a.step_number - b.step_number,
      );

      try {
        for (const action of orderedActions) {
          if (!CRON_SAFE_ACTION_TYPES.has(action.action_type)) {
            throw new Error(
              `Action type "${action.action_type}" requires a signed-in context and isn't supported for no-next-action workflows yet`,
            );
          }
          await runWorkflowAction(supabase, workflowRow.account_id, lead.id, action);
        }

        await supabase.from("activities").insert({
          account_id: workflowRow.account_id,
          lead_id: lead.id,
          type: "workflow_triggered",
          payload: {
            workflow_id: workflowRow.id,
            workflow_name: workflowRow.name,
            status: "success",
          },
        });
        triggered += 1;
      } catch (error) {
        await supabase.from("activities").insert({
          account_id: workflowRow.account_id,
          lead_id: lead.id,
          type: "workflow_triggered",
          payload: {
            workflow_id: workflowRow.id,
            workflow_name: workflowRow.name,
            status: "failed",
            error: error instanceof Error ? error.message : "Unknown error",
          },
        });
        failed += 1;
      }
    }
  }

  return { triggered, failed };
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();

  const sequenceResult = await processDueSequenceSteps(supabase);
  const workflowResult = await processNoActivityWorkflows(supabase);
  const noNextActionResult = await processNoNextActionWorkflows(supabase);

  return NextResponse.json({
    sequenceSteps: sequenceResult,
    noActivityWorkflows: workflowResult,
    noNextActionWorkflows: noNextActionResult,
  });
}
