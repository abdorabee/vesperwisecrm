import type { SupabaseClient } from "@supabase/supabase-js";
import { isAiConfigured } from "@/lib/ai/client";
import { scoreAndStoreLead } from "@/lib/ai/score-lead-record";
import {
  BILLING_PLAN_CATALOG,
  deriveBillingAccessMode,
  type BillingPlan,
  type BillingProviderStatus,
  type BillingSource,
} from "@/lib/billing/entitlements";
import { consumeRateLimit } from "@/lib/rate-limit";
import type { Database } from "@/lib/supabase/types";

const AI_SCORE_CALLS_PER_MINUTE = 20;

type CRMClient = SupabaseClient<Database>;

interface BillingRow {
  source: string;
  plan_key: string | null;
  provider_status: string | null;
  cancel_at_period_end: boolean;
  current_period_end: string | null;
  past_due_since: string | null;
  trial_end: string | null;
}

function asPlan(value: string | null): BillingPlan | null {
  return value === "starter" || value === "team" || value === "scale" ? value : null;
}

function asSource(value: string): BillingSource {
  return value === "polar" || value === "grandfathered" || value === "trial"
    ? value
    : "none";
}

function asProviderStatus(value: string | null): BillingProviderStatus | null {
  if (
    value === "incomplete" ||
    value === "incomplete_expired" ||
    value === "trialing" ||
    value === "active" ||
    value === "past_due" ||
    value === "canceled" ||
    value === "unpaid" ||
    value === "revoked" ||
    value === "paused"
  ) {
    return value;
  }
  return null;
}

export function billingAllowsAi(row: BillingRow | null, now = new Date()): boolean {
  if (!row) return false;

  const plan = asPlan(row.plan_key);
  const accessMode = deriveBillingAccessMode(
    {
      source: asSource(row.source),
      plan,
      providerStatus: asProviderStatus(row.provider_status),
      cancelAtPeriodEnd: row.cancel_at_period_end,
      currentPeriodEnd: row.current_period_end,
      pastDueSince: row.past_due_since,
      trialEnd: row.trial_end,
    },
    now,
  );

  return (
    accessMode === "full" &&
    Boolean(plan && BILLING_PLAN_CATALOG[plan].capabilities.includes("ai"))
  );
}

export async function scoreLeadIfConfigured(
  supabase: CRMClient,
  input: {
    accountId: string;
    leadId: string;
    actorUserId?: string | null;
    reason?: string;
  },
): Promise<"scored" | "skipped"> {
  if (!isAiConfigured()) return "skipped";

  try {
    const { data, error } = await supabase
      .from("billing_accounts")
      .select(
        "source, plan_key, provider_status, cancel_at_period_end, current_period_end, past_due_since, trial_end",
      )
      .eq("account_id", input.accountId)
      .maybeSingle();

    if (error || !billingAllowsAi(data)) return "skipped";

    const withinBudget = await consumeRateLimit({
      scope: "ai-score-lead",
      identifier: input.actorUserId || input.accountId,
      limit: AI_SCORE_CALLS_PER_MINUTE,
      windowSeconds: 60,
    });
    if (!withinBudget) return "skipped";

    await scoreAndStoreLead(
      supabase,
      input.accountId,
      input.leadId,
      input.actorUserId ?? null,
    );
    return "scored";
  } catch (error) {
    console.error(
      JSON.stringify({
        scope: input.reason ?? "score-on-create",
        event: "score_failed",
        lead_id: input.leadId,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    );
    return "skipped";
  }
}

export async function scoreNewLeadIfConfigured(
  supabase: CRMClient,
  input: {
    accountId: string;
    leadId: string;
    actorUserId?: string | null;
    reason?: string;
  },
): Promise<"scored" | "skipped"> {
  return scoreLeadIfConfigured(supabase, {
    ...input,
    reason: input.reason ?? "score-on-create",
  });
}

export async function rescoreLeadQuietly(
  supabase: CRMClient,
  input: {
    accountId: string;
    leadId: string;
    actorUserId?: string | null;
    reason: "note" | "disposition" | "parsed_call";
  },
): Promise<void> {
  await scoreLeadIfConfigured(supabase, input);
}
