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
  teamLifetimeProductId: "prod_team_lifetime",
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

  it("ignores missing account metadata and unknown products instead of failing delivery", () => {
    expect(
      normalizePolarEvent(
        {
          type: "subscription.created",
          timestamp: "2026-08-16T10:00:01.000Z",
          data: { ...subscription, metadata: {}, customer: {} },
        },
        "evt_missing_account",
        config,
      ),
    ).toMatchObject({ kind: "ignored", eventType: "subscription.created" });

    expect(
      normalizePolarEvent(
        {
          type: "subscription.created",
          timestamp: "2026-08-16T10:00:01.000Z",
          data: { ...subscription, productId: "prod_unknown" },
        },
        "evt_unknown_product",
        config,
      ),
    ).toMatchObject({ kind: "ignored", accountId: "account_123" });
  });

  it("accepts Polar snake_case payloads and newer subscription event types", () => {
    expect(
      normalizePolarEvent(
        {
          type: "subscription.cycled",
          timestamp: "2026-08-16T10:00:01.000Z",
          data: {
            id: "sub_123",
            modified_at: "2026-08-16T10:00:00.000Z",
            status: "active",
            current_period_start: "2026-08-16T10:00:00.000Z",
            current_period_end: "2026-09-16T10:00:00.000Z",
            cancel_at_period_end: false,
            customer_id: "cust_123",
            product_id: "prod_team",
            seats: 4,
            metadata: { account_id: "account_123" },
            customer: { external_id: "account_123" },
          },
        },
        "evt_cycled",
        config,
      ),
    ).toMatchObject({
      kind: "subscription",
      accountId: "account_123",
      subscription: {
        plan: "team",
        providerStatus: "active",
        polarProductId: "prod_team",
        seats: 4,
      },
    });
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
      order: {
        subscriptionId: "sub_123",
        productId: "prod_team",
        grant: "subscription_payment",
      },
    });
  });

  it("recognizes a one-time lifetime Team order only for the configured product", () => {
    expect(
      normalizePolarEvent(
        {
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
            metadata: { account_id: "account_123" },
          },
        },
        "evt_lifetime",
        config,
      ),
    ).toMatchObject({
      kind: "order_paid",
      order: {
        id: "order_life",
        productId: "prod_team_lifetime",
        subscriptionId: null,
        grant: "team_lifetime",
        polarCustomerId: "cust_life",
        seats: 3,
      },
    });

    expect(
      normalizePolarEvent(
        {
          type: "order.paid",
          timestamp: "2026-08-16T10:00:01.000Z",
          data: {
            id: "order_team_once",
            product_id: "prod_team",
            subscription_id: null,
            billing_reason: "purchase",
            product: { is_recurring: false, recurring_interval: null },
            metadata: { account_id: "account_123" },
          },
        },
        "evt_team_once",
        config,
      ),
    ).toMatchObject({
      kind: "order_paid",
      order: { productId: "prod_team", grant: "subscription_payment" },
    });

    expect(
      normalizePolarEvent(
        {
          type: "order.paid",
          timestamp: "2026-08-16T10:00:01.000Z",
          data: {
            id: "order_snake",
            modified_at: "2026-08-16T10:00:00.000Z",
            product_id: "prod_team_lifetime",
            subscription_id: null,
            billing_reason: "purchase",
            customer_id: "cust_snake",
            seats: "4",
            product: {
              id: "prod_team_lifetime",
              is_recurring: false,
              recurring_interval: null,
            },
            customer: { external_id: "account_123" },
          },
        },
        "evt_lifetime_snake",
        config,
      ),
    ).toMatchObject({
      kind: "order_paid",
      accountId: "account_123",
      providerModifiedAt: "2026-08-16T10:00:00.000Z",
      order: {
        grant: "team_lifetime",
        polarCustomerId: "cust_snake",
        seats: 4,
        subscriptionId: null,
      },
    });
  });

  it("keeps subscription payments when the lifetime product id matches Team", () => {
    expect(
      normalizePolarEvent(
        {
          type: "order.paid",
          timestamp: "2026-08-16T10:00:01.000Z",
          data: {
            id: "order_same_product",
            productId: "prod_team",
            subscriptionId: "sub_123",
            billingReason: "subscription_cycle",
            product: { isRecurring: true, recurringInterval: "month" },
            metadata: { account_id: "account_123" },
          },
        },
        "evt_same_product",
        { ...config, teamLifetimeProductId: "prod_team" },
      ),
    ).toMatchObject({
      kind: "order_paid",
      order: {
        grant: "subscription_payment",
        subscriptionId: "sub_123",
        productId: "prod_team",
      },
    });
  });

  it("ignores lifetime product orders that are recurring or tied to a subscription", () => {
    expect(
      normalizePolarEvent(
        {
          type: "order.paid",
          timestamp: "2026-08-16T10:00:01.000Z",
          data: {
            id: "order_sub",
            productId: "prod_team_lifetime",
            subscriptionId: "sub_999",
            billingReason: "purchase",
            product: { isRecurring: false },
            metadata: { account_id: "account_123" },
          },
        },
        "evt_lifetime_sub",
        config,
      ),
    ).toMatchObject({ kind: "ignored" });

    expect(
      normalizePolarEvent(
        {
          type: "order.paid",
          timestamp: "2026-08-16T10:00:01.000Z",
          data: {
            id: "order_cycle",
            productId: "prod_team_lifetime",
            subscriptionId: null,
            billingReason: "subscription_cycle",
            product: { isRecurring: false },
            metadata: { account_id: "account_123" },
          },
        },
        "evt_lifetime_cycle",
        config,
      ),
    ).toMatchObject({ kind: "ignored" });

    expect(
      normalizePolarEvent(
        {
          type: "order.paid",
          timestamp: "2026-08-16T10:00:01.000Z",
          data: {
            id: "order_recurring",
            productId: "prod_team_lifetime",
            billingReason: "purchase",
            product: { isRecurring: true },
            metadata: { account_id: "account_123" },
          },
        },
        "evt_lifetime_recurring",
        config,
      ),
    ).toMatchObject({ kind: "ignored" });

    expect(
      normalizePolarEvent(
        {
          type: "order.paid",
          timestamp: "2026-08-16T10:00:01.000Z",
          data: {
            id: "order_unconfigured",
            productId: "prod_team_lifetime",
            billingReason: "purchase",
            product: { isRecurring: false },
            metadata: { account_id: "account_123" },
          },
        },
        "evt_unconfigured",
        { ...config, teamLifetimeProductId: null },
      ),
    ).toMatchObject({ kind: "ignored" });
  });
});
