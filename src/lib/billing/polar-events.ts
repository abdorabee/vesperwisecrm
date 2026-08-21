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
  "subscription.cycled",
  "subscription.paused",
  "subscription.resumed",
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

function pick(value: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (value[key] !== undefined) {
      return value[key];
    }
  }
  return undefined;
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

function boolValue(value: Record<string, unknown>, ...keys: string[]): boolean {
  return pick(value, ...keys) === true;
}

function accountIdFromData(data: Record<string, unknown>): string | null {
  const metadata = record(data.metadata);
  const customer = record(data.customer);
  const accountId =
    stringValue(pick(metadata, "account_id", "accountId")) ??
    stringValue(pick(customer, "externalId", "external_id"));

  return accountId;
}

function productIdFromData(data: Record<string, unknown>): string | null {
  const product = record(data.product);
  return (
    stringValue(pick(data, "productId", "product_id")) ??
    stringValue(pick(product, "id"))
  );
}

function planForProduct(config: BillingConfig, productId: string): BillingPlan | null {
  for (const plan of ["starter", "team", "scale"] as const) {
    if (config.productIds[plan] === productId) {
      return plan;
    }
  }
  return null;
}

function statusForEvent(
  eventType: string,
  payloadStatus: unknown,
): BillingProviderStatus | null {
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
  return null;
}

function ignoredEvent(
  providerEventId: string,
  eventType: string,
  accountId: string | null,
  providerModifiedAt: string | null,
): NormalizedIgnoredPolarEvent {
  return {
    kind: "ignored",
    providerEventId,
    eventType,
    accountId,
    providerModifiedAt,
  };
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
    return ignoredEvent(providerEventId, eventType, null, eventTimestamp);
  }

  const data = record(eventRecord.data);
  const accountId = accountIdFromData(data);
  const providerModifiedAt =
    dateValue(pick(data, "modifiedAt", "modified_at")) ?? eventTimestamp;

  if (!accountId) {
    return ignoredEvent(providerEventId, eventType, null, providerModifiedAt);
  }

  if (SUBSCRIPTION_EVENT_TYPES.has(eventType)) {
    const productId = productIdFromData(data);
    const subscriptionId = stringValue(data.id);
    const plan = productId ? planForProduct(config, productId) : null;
    const providerStatus = statusForEvent(eventType, data.status);
    const rawSeats = pick(data, "seats");
    const seats = rawSeats == null ? 1 : Number(rawSeats);

    if (
      !productId ||
      !subscriptionId ||
      !plan ||
      !providerStatus ||
      !Number.isInteger(seats) ||
      seats < 1 ||
      seats > 1000
    ) {
      return ignoredEvent(providerEventId, eventType, accountId, providerModifiedAt);
    }

    return {
      providerEventId,
      eventType,
      accountId,
      providerModifiedAt,
      kind: "subscription",
      subscription: {
        id: subscriptionId,
        plan,
        providerStatus,
        polarCustomerId: stringValue(pick(data, "customerId", "customer_id")),
        polarProductId: productId,
        seats,
        currentPeriodStart: dateValue(
          pick(data, "currentPeriodStart", "current_period_start"),
        ),
        currentPeriodEnd: dateValue(
          pick(data, "currentPeriodEnd", "current_period_end"),
        ),
        trialStart: dateValue(pick(data, "trialStart", "trial_start")),
        trialEnd: dateValue(pick(data, "trialEnd", "trial_end")),
        cancelAtPeriodEnd: boolValue(
          data,
          "cancelAtPeriodEnd",
          "cancel_at_period_end",
        ),
        pastDueSince:
          providerStatus === "past_due"
            ? dateValue(pick(data, "pastDueAt", "past_due_at")) ??
              providerModifiedAt
            : null,
      },
    };
  }

  const productId = productIdFromData(data);
  const orderId = stringValue(data.id);
  if (!productId || !orderId || !planForProduct(config, productId)) {
    return ignoredEvent(providerEventId, eventType, accountId, providerModifiedAt);
  }

  return {
    providerEventId,
    eventType,
    accountId,
    providerModifiedAt,
    kind: "order_paid",
    order: {
      id: orderId,
      productId,
      subscriptionId: stringValue(pick(data, "subscriptionId", "subscription_id")),
    },
  };
}
