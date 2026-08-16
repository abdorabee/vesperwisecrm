import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { BillingCapability, BillingPlan } from "@/lib/billing/entitlements";
import {
  BILLING_PLAN_CATALOG,
  deriveBillingAccessMode,
  getBillingPlanLeadLimit,
  type BillingAccessMode,
  type BillingProviderStatus,
  type BillingSource,
} from "@/lib/billing/entitlements";

export interface BillingState {
  accountId: string;
  source: BillingSource;
  plan: BillingPlan | null;
  providerStatus: BillingProviderStatus | null;
  polarCustomerId: string | null;
  polarSubscriptionId: string | null;
  seats: number;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialStart: string | null;
  trialEnd: string | null;
  cancelAtPeriodEnd: boolean;
  pastDueSince: string | null;
  lastProviderModifiedAt: string | null;
}

export interface BillingSummary extends BillingState {
  accessMode: BillingAccessMode;
  memberCount: number;
  pendingInviteCount: number;
  seatsAvailable: number;
  leadUsage: number;
  leadLimit: number | null;
}

export type BillingAccountRow = {
  account_id: string;
  source: string;
  plan_key: string | null;
  provider_status: string | null;
  polar_customer_id: string | null;
  polar_subscription_id: string | null;
  seats: number;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_start: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean;
  past_due_since: string | null;
  last_provider_modified_at: string | null;
};

function asPlan(value: string | null): BillingPlan | null {
  return value === "starter" || value === "team" || value === "scale"
    ? value
    : null;
}

function asSource(value: string): BillingSource {
  return value === "polar" || value === "grandfathered" ? value : "none";
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

export function billingStateFromRow(row: BillingAccountRow): BillingState {
  return {
    accountId: row.account_id,
    source: asSource(row.source),
    plan: asPlan(row.plan_key),
    providerStatus: asProviderStatus(row.provider_status),
    polarCustomerId: row.polar_customer_id,
    polarSubscriptionId: row.polar_subscription_id,
    seats: row.seats,
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
    trialStart: row.trial_start,
    trialEnd: row.trial_end,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    pastDueSince: row.past_due_since,
    lastProviderModifiedAt: row.last_provider_modified_at,
  };
}

export async function getBillingState(accountId: string): Promise<BillingState> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("billing_accounts")
    .select(
      "account_id, source, plan_key, provider_status, polar_customer_id, polar_subscription_id, seats, current_period_start, current_period_end, trial_start, trial_end, cancel_at_period_end, past_due_since, last_provider_modified_at",
    )
    .eq("account_id", accountId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Billing state not found");
  }

  return billingStateFromRow(data as BillingAccountRow);
}

export async function getBillingSummary(accountId: string): Promise<BillingSummary> {
  const supabase = await createClient();
  const state = await getBillingState(accountId);
  const periodStart = new Date();
  periodStart.setUTCDate(1);
  periodStart.setUTCHours(0, 0, 0, 0);

  const [{ count: memberCount, error: memberError }, { count: pendingInviteCount, error: inviteError }, { data: usage, error: usageError }] =
    await Promise.all([
      supabase
        .from("account_members")
        .select("user_id", { count: "exact", head: true })
        .eq("account_id", accountId),
      supabase
        .from("invites")
        .select("id", { count: "exact", head: true })
        .eq("account_id", accountId)
        .is("redeemed_at", null)
        .gt("expires_at", new Date().toISOString()),
      supabase
        .from("billing_usage_periods")
        .select("leads_created")
        .eq("account_id", accountId)
        .eq("period_start", periodStart.toISOString().slice(0, 10))
        .maybeSingle(),
    ]);

  if (memberError || inviteError || usageError) {
    throw new Error(
      memberError?.message ?? inviteError?.message ?? usageError?.message ?? "Failed to load billing summary",
    );
  }

  const members = memberCount ?? 0;
  const invites = pendingInviteCount ?? 0;
  return {
    ...state,
    accessMode: deriveBillingAccessMode(state, new Date()),
    memberCount: members,
    pendingInviteCount: invites,
    seatsAvailable: state.seats - members - invites,
    leadUsage: usage?.leads_created ?? 0,
    leadLimit: state.plan ? getBillingPlanLeadLimit(state.plan) : null,
  };
}

export async function requireBillingCapability(
  accountId: string,
  capability: BillingCapability,
): Promise<{ plan: BillingPlan; accessMode: "full" }> {
  const state = await getBillingState(accountId);
  const accessMode = deriveBillingAccessMode(state, new Date());

  if (accessMode === "billing_required") {
    throw new Error("Choose a billing plan to continue");
  }
  if (accessMode === "read_only") {
    throw new Error("This workspace is read-only until billing is restored");
  }
  if (!state.plan || !BILLING_PLAN_CATALOG[state.plan].capabilities.includes(capability)) {
    throw new Error(`The ${capability.replaceAll("_", " ")} feature is not included in this plan`);
  }

  return { plan: state.plan, accessMode: "full" };
}

export async function requireWritableBilling(accountId: string): Promise<BillingState> {
  const state = await getBillingState(accountId);
  const accessMode = deriveBillingAccessMode(state, new Date());
  if (accessMode === "billing_required") {
    throw new Error("Choose a billing plan to continue");
  }
  if (accessMode === "read_only") {
    throw new Error("This workspace is read-only until billing is restored");
  }
  return state;
}

export function hasWritableBillingAccess(state: BillingState): boolean {
  return deriveBillingAccessMode(state, new Date()) === "full";
}
