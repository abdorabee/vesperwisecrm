import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { sendDueStep } from "@/lib/sequences/send-step";
import { isAuthorizedCronRequest } from "@/lib/cron/authorize";
import {
  billingStateFromRow,
  hasWritableBillingAccess,
} from "@/lib/billing/access";
import { canRunScheduledWorkflows } from "@/lib/billing/entitlements";
import {
  processNoActivityWorkflows,
  processNoNextActionWorkflows,
} from "@/lib/workflows/scheduled";

async function getWritableBillingAccounts(
  supabase: ReturnType<typeof createServiceRoleClient>,
): Promise<Set<string>> {
  const { data } = await supabase.from("billing_accounts").select("*");
  return new Set(
    (data ?? [])
      .filter((row) => hasWritableBillingAccess(billingStateFromRow(row)))
      .map((row) => row.account_id),
  );
}

async function processDueSequenceSteps(
  supabase: ReturnType<typeof createServiceRoleClient>,
): Promise<{ sent: number; failed: number }> {
  const writableAccounts = await getWritableBillingAccounts(supabase);
  const { data: dueEnrollments } = await supabase
    .from("lead_sequence_enrollments")
    .select("id, account_id, lead_id")
    .eq("status", "active")
    .not("next_step_due_at", "is", null)
    .lte("next_step_due_at", new Date().toISOString());

  let sent = 0;
  let failed = 0;

  for (const enrollment of dueEnrollments ?? []) {
    if (!writableAccounts.has(enrollment.account_id)) {
      continue;
    }
    try {
      const result = await sendDueStep(supabase, enrollment.id, null);
      if (!result.skipped) {
        sent += 1;
      }
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

async function getWorkflowCapableAccounts(
  supabase: ReturnType<typeof createServiceRoleClient>,
): Promise<Set<string>> {
  const { data } = await supabase.from("billing_accounts").select("*");
  return new Set(
    (data ?? [])
      .map((row) => billingStateFromRow(row))
      .filter((state) => canRunScheduledWorkflows(state))
      .map((state) => state.accountId),
  );
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const capableAccounts = await getWorkflowCapableAccounts(supabase);

  const sequenceResult = await processDueSequenceSteps(supabase);
  const workflowResult = await processNoActivityWorkflows(supabase, capableAccounts);
  const noNextActionResult = await processNoNextActionWorkflows(supabase, capableAccounts);

  return NextResponse.json({
    sequenceSteps: sequenceResult,
    noActivityWorkflows: workflowResult,
    noNextActionWorkflows: noNextActionResult,
  });
}
