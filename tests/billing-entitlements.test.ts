import { describe, expect, it } from "vitest";

import {
  BILLING_PLAN_CATALOG,
  canRunScheduledWorkflows,
  deriveBillingAccessMode,
  getBillableNavCapabilities,
  getBillingPlanCapabilities,
  getBillingPlanLeadLimit,
  type BillingPlan,
  type BillingSubscriptionState,
} from "@/lib/billing/entitlements";

function subscription(
  overrides: Partial<BillingSubscriptionState> = {},
): BillingSubscriptionState {
  return {
    source: "polar",
    plan: "starter",
    providerStatus: "active",
    cancelAtPeriodEnd: false,
    currentPeriodEnd: "2026-09-01T00:00:00.000Z",
    pastDueSince: null,
    trialEnd: null,
    ...overrides,
  };
}

describe("billing plan catalog", () => {
  it("inherits Starter capabilities in Team and Scale", () => {
    const starter = getBillingPlanCapabilities("starter");
    const team = getBillingPlanCapabilities("team");
    const scale = getBillingPlanCapabilities("scale");

    expect(team).toEqual(expect.arrayContaining(starter));
    expect(scale).toEqual(expect.arrayContaining(team));
  });

  it("keeps Starter capped at 1,000 leads and higher plans unlimited", () => {
    expect(getBillingPlanLeadLimit("starter")).toBe(1000);
    expect(getBillingPlanLeadLimit("team")).toBeNull();
    expect(getBillingPlanLeadLimit("scale")).toBeNull();
  });

  it("keeps Scale checkout disabled and does not add unshipped capabilities", () => {
    expect(BILLING_PLAN_CATALOG.scale.checkoutEnabled).toBe(false);
    expect(getBillingPlanCapabilities("scale")).toEqual(
      getBillingPlanCapabilities("team"),
    );
  });

  it("hides dialer, workflows, and routing after trial_end", () => {
    expect(getBillableNavCapabilities("team", "full")).toEqual(
      expect.arrayContaining(["dialer", "workflows", "routing"]),
    );
    expect(getBillableNavCapabilities("team", "billing_required")).not.toContain(
      "dialer",
    );
    expect(getBillableNavCapabilities("team", "billing_required")).not.toContain(
      "workflows",
    );
    expect(getBillableNavCapabilities("team", "billing_required")).not.toContain(
      "routing",
    );
    expect(getBillableNavCapabilities("team", "billing_required")).toEqual(
      expect.arrayContaining(["pipeline", "queue", "sequences"]),
    );
    expect(getBillableNavCapabilities("starter", "full")).not.toContain("dialer");
    expect(getBillableNavCapabilities("starter", "full")).not.toContain("workflows");
  });

  it("blocks scheduled workflows on a writable Starter plan and an expired trial", () => {
    expect(canRunScheduledWorkflows(subscription())).toBe(false);
    expect(
      canRunScheduledWorkflows(
        subscription({
          source: "polar",
          plan: "team",
          providerStatus: "active",
        }),
      ),
    ).toBe(true);
    expect(
      canRunScheduledWorkflows(
        subscription({
          source: "trial",
          plan: "team",
          providerStatus: "trialing",
          trialEnd: "2026-08-01T00:00:00.000Z",
        }),
        new Date("2026-08-16T00:00:00.000Z"),
      ),
    ).toBe(false);
  });
});

describe("billing access state", () => {
  const cases: Array<[
    string,
    BillingSubscriptionState,
    "full" | "read_only" | "billing_required",
  ]> = [
    ["active subscription", subscription(), "full"],
    ["trialing subscription", subscription({ providerStatus: "trialing" }), "full"],
    [
      "scheduled cancellation before period end",
      subscription({ cancelAtPeriodEnd: true }),
      "full",
    ],
    [
      "past due within seven days",
      subscription({
        providerStatus: "past_due",
        pastDueSince: "2026-08-12T00:00:00.000Z",
      }),
      "full",
    ],
    [
      "past due after seven days",
      subscription({
        providerStatus: "past_due",
        pastDueSince: "2026-08-01T00:00:00.000Z",
      }),
      "read_only",
    ],
    ["revoked subscription", subscription({ providerStatus: "revoked" }), "read_only"],
    ["missing subscription", subscription({ source: "none", plan: null }), "billing_required"],
    [
      "team trial inside the window",
      subscription({
        source: "trial",
        plan: "team",
        providerStatus: "trialing",
        trialEnd: "2026-10-15T00:00:00.000Z",
      }),
      "full",
    ],
    [
      "team trial after trial_end",
      subscription({
        source: "trial",
        plan: "team",
        providerStatus: "trialing",
        trialEnd: "2026-08-01T00:00:00.000Z",
      }),
      "billing_required",
    ],
  ];

  it.each(cases)("derives %s correctly", (_name, state, expected) => {
    expect(
      deriveBillingAccessMode(state, new Date("2026-08-16T00:00:00.000Z")),
    ).toBe(expected);
  });
});

describe("billing plan type", () => {
  it("accepts exactly the three supported plans", () => {
    const plans: BillingPlan[] = ["starter", "team", "scale"];
    expect(plans).toHaveLength(3);
  });
});
