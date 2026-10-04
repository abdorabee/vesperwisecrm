export type BillingPlan = "starter" | "team" | "scale";

export type BillingCapability =
  | "pipeline"
  | "queue"
  | "sequences"
  | "dialer"
  | "ai"
  | "workflows"
  | "routing";

export type BillingSource = "polar" | "grandfathered" | "none" | "trial";

export type BillingProviderStatus =
  | "incomplete"
  | "incomplete_expired"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "revoked"
  | "paused";

export interface BillingSubscriptionState {
  source: BillingSource;
  plan: BillingPlan | null;
  providerStatus: BillingProviderStatus | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  pastDueSince: string | null;
  trialEnd: string | null;
}

export type BillingAccessMode = "full" | "read_only" | "billing_required";

interface BillingPlanDefinition {
  capabilities: readonly BillingCapability[];
  leadLimitPerUtcMonth: number | null;
  checkoutEnabled: boolean;
}

const STARTER_CAPABILITIES: readonly BillingCapability[] = [
  "pipeline",
  "queue",
  "sequences",
];

const TEAM_CAPABILITIES: readonly BillingCapability[] = [
  ...STARTER_CAPABILITIES,
  "dialer",
  "ai",
  "workflows",
  "routing",
];

export const BILLING_PLAN_CATALOG: Record<BillingPlan, BillingPlanDefinition> = {
  starter: {
    capabilities: STARTER_CAPABILITIES,
    leadLimitPerUtcMonth: 1000,
    checkoutEnabled: true,
  },
  team: {
    capabilities: TEAM_CAPABILITIES,
    leadLimitPerUtcMonth: null,
    checkoutEnabled: true,
  },
  scale: {
    capabilities: TEAM_CAPABILITIES,
    leadLimitPerUtcMonth: null,
    checkoutEnabled: false,
  },
};

const FULL_ACCESS_NAV_CAPABILITIES = new Set<BillingCapability>([
  "dialer",
  "workflows",
  "routing",
]);

export function getBillingPlanCapabilities(
  plan: BillingPlan,
): BillingCapability[] {
  return [...BILLING_PLAN_CATALOG[plan].capabilities];
}

export function getBillingPlanLeadLimit(plan: BillingPlan): number | null {
  return BILLING_PLAN_CATALOG[plan].leadLimitPerUtcMonth;
}

export function getBillableNavCapabilities(
  plan: BillingPlan | null,
  accessMode: BillingAccessMode,
): BillingCapability[] {
  if (!plan) return [];
  const capabilities = getBillingPlanCapabilities(plan);
  if (accessMode === "full") return capabilities;
  return capabilities.filter(
    (capability) => !FULL_ACCESS_NAV_CAPABILITIES.has(capability),
  );
}

export function canRunScheduledWorkflows(
  state: BillingSubscriptionState,
  now = new Date(),
): boolean {
  return (
    deriveBillingAccessMode(state, now) === "full" &&
    Boolean(
      state.plan &&
        BILLING_PLAN_CATALOG[state.plan].capabilities.includes("workflows"),
    )
  );
}

function isWithinPastDueGracePeriod(
  pastDueSince: string | null,
  now: Date,
): boolean {
  if (!pastDueSince) {
    return false;
  }

  const graceEndsAt = new Date(pastDueSince).getTime() + 7 * 24 * 60 * 60 * 1000;
  return now.getTime() < graceEndsAt;
}

export function deriveBillingAccessMode(
  state: BillingSubscriptionState,
  now = new Date(),
): BillingAccessMode {
  if (state.source === "trial") {
    const trialEndsAt = state.trialEnd ? new Date(state.trialEnd).getTime() : Number.NaN;
    if (state.plan && now.getTime() < trialEndsAt) {
      return "full";
    }
    return "billing_required";
  }

  if (state.source === "none" || !state.plan) {
    return "billing_required";
  }

  if (state.source === "grandfathered") {
    return "full";
  }

  if (state.providerStatus === "past_due") {
    return isWithinPastDueGracePeriod(state.pastDueSince, now)
      ? "full"
      : "read_only";
  }

  if (
    state.cancelAtPeriodEnd &&
    state.currentPeriodEnd &&
    now.getTime() < new Date(state.currentPeriodEnd).getTime()
  ) {
    return "full";
  }

  if (state.providerStatus === "active" || state.providerStatus === "trialing") {
    return "full";
  }

  return "read_only";
}
