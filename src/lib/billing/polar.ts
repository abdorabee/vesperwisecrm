import "server-only";

import { Polar } from "@polar-sh/sdk";
import type { BillingPlan } from "@/lib/billing/entitlements";
import { BILLING_PLAN_CATALOG } from "@/lib/billing/entitlements";
import {
  getBillingConfig,
  getBillingProductId,
} from "@/lib/billing/config";

export interface PolarCheckoutInput {
  accountId: string;
  plan: BillingPlan;
  seats: number;
  customerEmail?: string | null;
  customerName?: string | null;
  successUrl: string;
  returnUrl: string;
}

export interface PolarCheckoutResult {
  id: string;
  url: string;
}

export interface PolarCustomerPortalResult {
  url: string;
}

function requireEnabledBilling() {
  const config = getBillingConfig();
  if (!config.enabled || !config.accessToken) {
    throw new Error("Polar billing is not configured");
  }
  return config;
}

export function getPolarClient(): Polar {
  const config = requireEnabledBilling();
  if (!config.accessToken) {
    throw new Error("Polar access token is not configured");
  }
  return new Polar({
    accessToken: config.accessToken,
    server: config.mode,
  });
}

export async function createPolarCheckout(
  input: PolarCheckoutInput,
): Promise<PolarCheckoutResult> {
  const config = requireEnabledBilling();
  const definition = BILLING_PLAN_CATALOG[input.plan];

  if (!definition.checkoutEnabled || (input.plan === "scale" && !config.scaleCheckoutEnabled)) {
    throw new Error("Checkout is not enabled for this plan");
  }

  const checkout = await getPolarClient().checkouts.create({
    products: [getBillingProductId(config, input.plan)],
    seats: input.seats,
    externalCustomerId: input.accountId,
    customerEmail: input.customerEmail ?? undefined,
    customerName: input.customerName ?? undefined,
    metadata: {
      account_id: input.accountId,
      plan: input.plan,
    },
    successUrl: input.successUrl,
    returnUrl: input.returnUrl,
  });

  return { id: checkout.id, url: checkout.url };
}

export async function createPolarCustomerPortalSession(input: {
  accountId: string;
  polarCustomerId?: string | null;
  returnUrl: string;
}): Promise<PolarCustomerPortalResult> {
  requireEnabledBilling();

  const session = await getPolarClient().customerSessions.create(
    input.polarCustomerId
      ? { customerId: input.polarCustomerId, returnUrl: input.returnUrl }
      : { externalCustomerId: input.accountId, returnUrl: input.returnUrl },
  );

  return { url: session.customerPortalUrl };
}

export async function updatePolarSubscriptionPlan(input: {
  subscriptionId: string;
  plan: BillingPlan;
}): Promise<void> {
  const config = requireEnabledBilling();
  const definition = BILLING_PLAN_CATALOG[input.plan];
  if (!definition.checkoutEnabled || input.plan === "scale") {
    throw new Error("Scale plan changes are not enabled yet");
  }

  await getPolarClient().subscriptions.update({
    id: input.subscriptionId,
    subscriptionUpdate: {
      productId: getBillingProductId(config, input.plan),
      prorationBehavior: "prorate",
    },
  });
}

export async function updatePolarSubscriptionSeats(input: {
  subscriptionId: string;
  seats: number;
}): Promise<void> {
  requireEnabledBilling();
  await getPolarClient().subscriptions.update({
    id: input.subscriptionId,
    subscriptionUpdate: {
      seats: input.seats,
      prorationBehavior: "prorate",
    },
  });
}

export async function updatePolarSubscriptionCancellation(input: {
  subscriptionId: string;
  cancelAtPeriodEnd: boolean;
}): Promise<void> {
  requireEnabledBilling();
  await getPolarClient().subscriptions.update({
    id: input.subscriptionId,
    subscriptionUpdate: {
      cancelAtPeriodEnd: input.cancelAtPeriodEnd,
    },
  });
}
