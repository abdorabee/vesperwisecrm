import { describe, expect, it } from "vitest";
import { isProviderUpdateStale, normalizePolarEvent } from "@/lib/billing/polar-events";
import type { BillingConfig } from "@/lib/billing/config";

const config: BillingConfig = {
  enabled: true,
  mode: "sandbox",
  accessToken: "token",
  webhookSecret: "secret",
  productIds: {
    starter: "prod_starter",
    team: "prod_team",
    scale: "prod_scale",
  },
  scaleCheckoutEnabled: false,
};

const subscription = {
  id: "sub_123",
  modifiedAt: "2026-08-16T10:00:00.000Z",
  status: "active",
  currentPeriodStart: "2026-08-16T10:00:00.000Z",
  currentPeriodEnd: "2026-09-16T10:00:00.000Z",
  trialStart: null,
  trialEnd: null,
  cancelAtPeriodEnd: false,
  pastDueAt: null,
  customerId: "cust_123",
  productId: "prod_team",
  seats: 4,
  metadata: { account_id: "account_123" },
  customer: { externalId: "account_123" },
};

describe("normalizePolarEvent", () => {
  it("identifies duplicate and out-of-order provider modifications", () => {
    expect(
      isProviderUpdateStale("2026-08-16T09:00:00.000Z", "2026-08-16T10:00:00.000Z"),
    ).toBe(true);
    expect(
      isProviderUpdateStale("2026-08-16T11:00:00.000Z", "2026-08-16T10:00:00.000Z"),
    ).toBe(false);
  });

  it("maps subscription products, seats, metadata, and provider status", () => {
    expect(
      normalizePolarEvent(
        {
          type: "subscription.active",
          timestamp: "2026-08-16T10:00:01.000Z",
          data: subscription,
        },
        "evt_123",
        config,
      ),
    ).toMatchObject({
      kind: "subscription",
      providerEventId: "evt_123",
      accountId: "account_123",
      providerModifiedAt: "2026-08-16T10:00:00.000Z",
      subscription: {
        plan: "team",
        providerStatus: "active",
        seats: 4,
        cancelAtPeriodEnd: false,
      },
    });
  });

  it("maps revocation and past-due events even when the payload status is stale", () => {
    expect(
      normalizePolarEvent(
        {
          type: "subscription.revoked",
          timestamp: "2026-08-16T10:00:01.000Z",
          data: { ...subscription, status: "unpaid" },
        },
        "evt_revoke",
        config,
      ),
    ).toMatchObject({ subscription: { providerStatus: "revoked" } });

    expect(
      normalizePolarEvent(
        {
          type: "subscription.past_due",
          timestamp: "2026-08-16T10:00:01.000Z",
          data: { ...subscription, status: "active", pastDueAt: "2026-08-16T10:00:00.000Z" },
        },
        "evt_past_due",
        config,
      ),
    ).toMatchObject({
      subscription: {
        providerStatus: "past_due",
        pastDueSince: "2026-08-16T10:00:00.000Z",
      },
    });
  });

  it("rejects missing account metadata and unknown products", () => {
    expect(() =>
      normalizePolarEvent(
        {
          type: "subscription.created",
          timestamp: "2026-08-16T10:00:01.000Z",
          data: { ...subscription, metadata: {}, customer: {} },
        },
        "evt_missing_account",
        config,
      ),
    ).toThrow("account metadata");

    expect(() =>
      normalizePolarEvent(
        {
          type: "subscription.created",
          timestamp: "2026-08-16T10:00:01.000Z",
          data: { ...subscription, productId: "prod_unknown" },
        },
        "evt_unknown_product",
        config,
      ),
    ).toThrow("unknown Polar product");
  });

  it("normalizes paid orders without changing the subscription status itself", () => {
    expect(
      normalizePolarEvent(
        {
          type: "order.paid",
          timestamp: "2026-08-16T10:00:01.000Z",
          data: {
            id: "order_123",
            modifiedAt: "2026-08-16T10:00:00.000Z",
            productId: "prod_team",
            subscriptionId: "sub_123",
            customer: { externalId: "account_123" },
            metadata: { account_id: "account_123" },
          },
        },
        "evt_order_paid",
        config,
      ),
    ).toMatchObject({
      kind: "order_paid",
      accountId: "account_123",
      order: { subscriptionId: "sub_123", productId: "prod_team" },
    });
  });
});
