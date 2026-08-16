import type { BillingConfig } from "@/lib/billing/config";
import type { BillingPlan, BillingProviderStatus } from "@/lib/billing/entitlements";

const SUBSCRIPTION_EVENT_TYPES = new Set([
  "subscription.created",
  "subscription.updated",
  "subscription.active",
  "subscription.canceled",
  "subscription.uncanceled",
  "subscription.past_due",
  "subscription.revoked",
]);

const SUPPORTED_EVENT_TYPES = new Set([...SUBSCRIPTION_EVENT_TYPES, "order.paid"]);

export interface NormalizedSubscriptionEvent {
  id: string;
  plan: BillingPlan;
  providerStatus: BillingProviderStatus;
  polarCustomerId: string | null;
  polarProductId: string;
  seats: number;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialStart: string | null;
  trialEnd: string | null;
  cancelAtPeriodEnd: boolean;
  pastDueSince: string | null;
}

export interface NormalizedOrderPaidEvent {
  id: string;
  productId: string;
  subscriptionId: string | null;
}

interface NormalizedPolarEventBase {
  providerEventId: string;
  eventType: string;
  accountId: string | null;
  providerModifiedAt: string | null;
}

export interface NormalizedSubscriptionPolarEvent
  extends NormalizedPolarEventBase {
  kind: "subscription";
  accountId: string;
  subscription: NormalizedSubscriptionEvent;
}

export interface NormalizedOrderPaidPolarEvent extends NormalizedPolarEventBase {
  kind: "order_paid";
  accountId: string;
  order: NormalizedOrderPaidEvent;
}

export interface NormalizedIgnoredPolarEvent extends NormalizedPolarEventBase {
  kind: "ignored";
  subscription?: NormalizedSubscriptionEvent;
  order?: NormalizedOrderPaidEvent;
}

export type NormalizedPolarEvent =
  | NormalizedSubscriptionPolarEvent
  | NormalizedOrderPaidPolarEvent
  | NormalizedIgnoredPolarEvent;

export function isProviderUpdateStale(
  incoming: string | null,
  stored: string | null,
): boolean {
  if (!incoming || !stored) {
    return false;
  }
  return new Date(incoming).getTime() <= new Date(stored).getTime();
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function dateValue(value: unknown): string | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function accountIdFromData(data: Record<string, unknown>): string {
  const metadata = record(data.metadata);
  const customer = record(data.customer);
  const accountId =
    stringValue(metadata.account_id) ?? stringValue(customer.externalId);

  if (!accountId) {
    throw new Error("Polar event is missing account metadata");
  }
  return accountId;
}

function planForProduct(config: BillingConfig, productId: string): BillingPlan {
  for (const plan of ["starter", "team", "scale"] as const) {
    if (config.productIds[plan] === productId) {
      return plan;
    }
  }
  throw new Error(`Received unknown Polar product: ${productId}`);
}

function statusForEvent(
  eventType: string,
  payloadStatus: unknown,
): BillingProviderStatus {
  if (eventType === "subscription.revoked") {
    return "revoked";
  }
  if (eventType === "subscription.past_due") {
    return "past_due";
  }
  const status = stringValue(payloadStatus);
  if (
    status === "incomplete" ||
    status === "incomplete_expired" ||
    status === "trialing" ||
    status === "active" ||
    status === "past_due" ||
    status === "canceled" ||
    status === "unpaid" ||
    status === "paused"
  ) {
    return status;
  }
  throw new Error("Polar subscription event has an unsupported status");
}

export function normalizePolarEvent(
  event: unknown,
  providerEventId: string,
  config: BillingConfig,
): NormalizedPolarEvent {
  const eventRecord = record(event);
  const eventType = stringValue(eventRecord.type) ?? "";
  const eventTimestamp = dateValue(eventRecord.timestamp);

  if (!SUPPORTED_EVENT_TYPES.has(eventType)) {
    return {
      providerEventId,
      eventType,
      accountId: null,
      providerModifiedAt: eventTimestamp,
      kind: "ignored",
    };
  }

  const data = record(eventRecord.data);
  const accountId = accountIdFromData(data);
  const providerModifiedAt = dateValue(data.modifiedAt) ?? eventTimestamp;

  if (SUBSCRIPTION_EVENT_TYPES.has(eventType)) {
    const productId = stringValue(data.productId);
    const subscriptionId = stringValue(data.id);
    if (!productId || !subscriptionId) {
      throw new Error("Polar subscription event is missing its product or ID");
    }

    const rawSeats = data.seats;
    const seats = rawSeats == null ? 1 : Number(rawSeats);
    if (!Number.isInteger(seats) || seats < 1 || seats > 1000) {
      throw new Error("Polar subscription has an invalid seat quantity");
    }

    const providerStatus = statusForEvent(eventType, data.status);
    return {
      providerEventId,
      eventType,
      accountId,
      providerModifiedAt,
      kind: "subscription",
      subscription: {
        id: subscriptionId,
        plan: planForProduct(config, productId),
        providerStatus,
        polarCustomerId: stringValue(data.customerId),
        polarProductId: productId,
        seats,
        currentPeriodStart: dateValue(data.currentPeriodStart),
        currentPeriodEnd: dateValue(data.currentPeriodEnd),
        trialStart: dateValue(data.trialStart),
        trialEnd: dateValue(data.trialEnd),
        cancelAtPeriodEnd: data.cancelAtPeriodEnd === true,
        pastDueSince:
          providerStatus === "past_due"
            ? dateValue(data.pastDueAt) ?? providerModifiedAt
            : null,
      },
    };
  }

  const productId = stringValue(data.productId);
  const orderId = stringValue(data.id);
  if (!productId || !orderId) {
    throw new Error("Polar paid order is missing its product or ID");
  }

  planForProduct(config, productId);
  return {
    providerEventId,
    eventType,
    accountId,
    providerModifiedAt,
    kind: "order_paid",
    order: {
      id: orderId,
      productId,
      subscriptionId: stringValue(data.subscriptionId),
    },
  };
}
