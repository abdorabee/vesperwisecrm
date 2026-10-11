import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ACCOUNT_ID = "00000000-0000-4000-8000-000000000123";

const state = vi.hoisted(() => ({
  account: {
    data: {
      polar_subscription_id: "sub_123",
      provider_status: "past_due",
      last_provider_modified_at: "2026-08-01T00:00:00.000Z",
    } as Record<string, unknown> | null,
    error: null as { code?: string; message: string } | null,
  },
  billingUpdates: [] as Array<Record<string, unknown>>,
  webhookUpdates: [] as Array<Record<string, unknown>>,
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({
    from(table: string) {
      const chain = {
        insert() {
          return chain;
        },
        update(values: Record<string, unknown>) {
          if (table === "billing_accounts") state.billingUpdates.push(values);
          if (table === "billing_webhook_events") state.webhookUpdates.push(values);
          return chain;
        },
        select() {
          return chain;
        },
        eq() {
          return chain;
        },
        maybeSingle() {
          return Promise.resolve({ data: { provider_event_id: "evt" }, error: null });
        },
        single() {
          if (table === "billing_accounts") {
            if (state.account.error) {
              return Promise.resolve({ data: null, error: state.account.error });
            }
            return Promise.resolve({ data: state.account.data, error: null });
          }
          return Promise.resolve({
            data: { processing_status: "failed" },
            error: null,
          });
        },
        then(
          onFulfilled: (value: { data: null; error: null }) => unknown,
          onRejected?: (reason: unknown) => unknown,
        ) {
          return Promise.resolve({ data: null, error: null }).then(onFulfilled, onRejected);
        },
      };
      return chain;
    },
  }),
}));

import { processPolarWebhook } from "@/lib/billing/polar-webhook";

function lifetimeOrder(data: Record<string, unknown> = {}) {
  return {
    type: "order.paid",
    timestamp: "2026-08-16T10:00:01.000Z",
    data: {
      id: "order_life",
      modifiedAt: "2026-08-16T10:00:00.000Z",
      productId: "prod_team_lifetime",
      subscriptionId: null,
      billingReason: "purchase",
      customerId: "cust_life",
      seats: 3,
      product: {
        id: "prod_team_lifetime",
        isRecurring: false,
        recurringInterval: null,
      },
      metadata: { account_id: ACCOUNT_ID },
      customer: { externalId: ACCOUNT_ID },
      ...data,
    },
  };
}

describe("lifetime Polar orders", () => {
  beforeEach(() => {
    state.billingUpdates.length = 0;
    state.webhookUpdates.length = 0;
    state.account.data = {
      polar_subscription_id: "sub_123",
      provider_status: "past_due",
      last_provider_modified_at: "2026-08-01T00:00:00.000Z",
    };
    state.account.error = null;
    vi.stubEnv("POLAR_BILLING_ENABLED", "true");
    vi.stubEnv("POLAR_ACCESS_TOKEN", "token");
    vi.stubEnv("POLAR_WEBHOOK_SECRET", "secret");
    vi.stubEnv("POLAR_STARTER_PRODUCT_ID", "prod_starter");
    vi.stubEnv("POLAR_TEAM_PRODUCT_ID", "prod_team");
    vi.stubEnv("POLAR_TEAM_LIFETIME_PRODUCT_ID", "prod_team_lifetime");
    vi.stubEnv("POLAR_MODE", "sandbox");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("grants permanent Team access from a one-time order", async () => {
    const result = await processPolarWebhook(lifetimeOrder(), "evt_lifetime");

    expect(result).toEqual({ duplicate: false, ignored: false });
    expect(state.billingUpdates).toHaveLength(1);
    expect(state.billingUpdates[0]).toMatchObject({
      source: "lifetime",
      plan_key: "team",
      provider_status: "active",
      polar_customer_id: "cust_life",
      polar_subscription_id: null,
      polar_product_id: "prod_team_lifetime",
      seats: 3,
      current_period_start: null,
      current_period_end: null,
      trial_start: null,
      trial_end: null,
      cancel_at_period_end: false,
      past_due_since: null,
      last_provider_modified_at: "2026-08-16T10:00:00.000Z",
    });
    expect(state.webhookUpdates.at(-1)).toMatchObject({
      processing_status: "processed",
    });
  });

  it("leaves seats unchanged when the one-time order has none", async () => {
    await processPolarWebhook(
      lifetimeOrder({ seats: null, customerId: null }),
      "evt_lifetime_seats",
    );

    expect(state.billingUpdates[0]).not.toHaveProperty("seats");
    expect(state.billingUpdates[0]).not.toHaveProperty("polar_customer_id");
    expect(state.billingUpdates[0]).toMatchObject({
      source: "lifetime",
      plan_key: "team",
      trial_end: null,
    });
  });

  it("keeps a subscription payment from granting lifetime Team", async () => {
    const result = await processPolarWebhook(
      {
        type: "order.paid",
        timestamp: "2026-08-16T10:00:01.000Z",
        data: {
          id: "order_123",
          modifiedAt: "2026-08-16T10:00:00.000Z",
          productId: "prod_team",
          subscriptionId: "sub_123",
          billingReason: "subscription_cycle",
          product: { id: "prod_team", isRecurring: true, recurringInterval: "month" },
          metadata: { account_id: ACCOUNT_ID },
        },
      },
      "evt_subscription_paid",
    );

    expect(result).toEqual({ duplicate: false, ignored: false });
    expect(state.billingUpdates).toHaveLength(1);
    expect(state.billingUpdates[0]).toMatchObject({
      provider_status: "active",
      past_due_since: null,
    });
    expect(state.billingUpdates[0]).not.toHaveProperty("source");
    expect(state.billingUpdates[0]).not.toHaveProperty("plan_key");
    expect(state.billingUpdates[0]).not.toHaveProperty("trial_end");
  });

  it("does not treat a one-time order for the subscription Team product as lifetime", async () => {
    const result = await processPolarWebhook(
      lifetimeOrder({
        id: "order_team_once",
        productId: "prod_team",
        product: { id: "prod_team", isRecurring: false, recurringInterval: null },
      }),
      "evt_team_once",
    );

    expect(result).toEqual({ duplicate: false, ignored: false });
    expect(state.billingUpdates).toEqual([]);
  });

  it("skips a stale lifetime order and a missing billing account", async () => {
    state.account.data = {
      last_provider_modified_at: "2026-08-16T12:00:00.000Z",
    };

    await processPolarWebhook(lifetimeOrder(), "evt_stale");
    expect(state.billingUpdates).toEqual([]);

    state.account.data = null;
    state.account.error = { code: "PGRST116", message: "not found" };
    const missing = await processPolarWebhook(lifetimeOrder(), "evt_missing");
    expect(missing).toEqual({ duplicate: false, ignored: false });
    expect(state.billingUpdates).toEqual([]);
  });
});

describe("lifetime license stays off the public offer", () => {
  it("keeps the published prices and the 60-day Team trial sentence", () => {
    const offer = readFileSync("src/lib/billing/public-offer.ts", "utf8");
    const pricing = readFileSync(
      "src/components/marketing/sections/pricing-preview.tsx",
      "utf8",
    );
    const checkout = readFileSync("src/lib/billing/polar-checkout.ts", "utf8");
    const polar = readFileSync("src/lib/billing/polar.ts", "utf8");
    const controls = readFileSync(
      "src/app/(dashboard)/settings/billing/_components/billing-controls.tsx",
      "utf8",
    );

    expect(offer).toContain(
      "Every new workspace gets Team for 60 days, no card. After the trial, Starter is $99 per seat per month and Team is $179 per seat per month through Polar.",
    );
    expect(offer).not.toMatch(/lifetime/i);
    expect(pricing).toContain('price: "$99"');
    expect(pricing).toContain('price: "$179"');
    expect(pricing).not.toMatch(/lifetime/i);
    expect(checkout).not.toContain("lifetime");
    expect(polar).not.toContain("POLAR_TEAM_LIFETIME_PRODUCT_ID");
    expect(polar).not.toContain("teamLifetimeProductId");
    expect(controls).toContain("Team trial ends");
    expect(controls).toContain('summary.source === "trial"');
  });
});
