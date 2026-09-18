import "server-only";

import { Polar } from "@polar-sh/sdk";
import { HTTPClient } from "@polar-sh/sdk/lib/http";
import type { BillingPlan } from "@/lib/billing/entitlements";
import { BILLING_PLAN_CATALOG } from "@/lib/billing/entitlements";
import {
  getBillingConfig,
  getBillingProductId,
} from "@/lib/billing/config";
import {
  buildPolarCheckoutCreate,
  productHasSeatBasedPrice,
} from "@/lib/billing/polar-checkout";
import {
  isPolarNotFound,
  isSeatPricingError,
  mapPolarRequestError,
} from "@/lib/billing/polar-errors";

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
  polarCustomerId: string | null;
}

export interface PolarCustomerPortalResult {
  url: string;
  polarCustomerId: string | null;
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
  const httpClient = new HTTPClient();
  httpClient.addHook("beforeRequest", (request) => {
    const nextRequest = new Request(request);
    nextRequest.headers.set("Polar-Version", "2026-04");
    return nextRequest;
  });
  return new Polar({
    accessToken: config.accessToken,
    server: config.mode,
    httpClient,
  });
}

async function productUsesSeatPricing(productId: string): Promise<boolean> {
  try {
    const product = await getPolarClient().products.get({ id: productId });
    return productHasSeatBasedPrice(product);
  } catch (error) {
    if (isPolarNotFound(error)) {
      throw mapPolarRequestError(error, "Polar product was not found", "product");
    }
    return true;
  }
}

export async function createPolarCheckout(
  input: PolarCheckoutInput,
): Promise<PolarCheckoutResult> {
  const config = requireEnabledBilling();
  const definition = BILLING_PLAN_CATALOG[input.plan];

  if (!definition.checkoutEnabled || (input.plan === "scale" && !config.scaleCheckoutEnabled)) {
    throw new Error("Checkout is not enabled for this plan");
  }

  const productId = getBillingProductId(config, input.plan);
  let includeSeats = await productUsesSeatPricing(productId);

  const create = (withSeats: boolean) =>
    getPolarClient().checkouts.create(
      buildPolarCheckoutCreate({
        productId,
        accountId: input.accountId,
        plan: input.plan,
        seats: input.seats,
        includeSeats: withSeats,
        customerEmail: input.customerEmail,
        customerName: input.customerName,
        successUrl: input.successUrl,
        returnUrl: input.returnUrl,
      }),
    );

  try {
    const checkout = await create(includeSeats);
    return {
      id: checkout.id,
      url: checkout.url,
      polarCustomerId: checkout.customerId,
    };
  } catch (error) {
    if (isSeatPricingError(error)) {
      includeSeats = !includeSeats;
      try {
        const checkout = await create(includeSeats);
        return {
          id: checkout.id,
          url: checkout.url,
          polarCustomerId: checkout.customerId,
        };
      } catch (retryError) {
        throw mapPolarRequestError(retryError, "Could not create Polar checkout", "product");
      }
    }
    throw mapPolarRequestError(error, "Could not create Polar checkout", "product");
  }
}

async function resolvePolarCustomerId(input: {
  accountId: string;
  polarCustomerId?: string | null;
  customerEmail?: string | null;
  customerName?: string | null;
}): Promise<string> {
  const client = getPolarClient();

  if (input.polarCustomerId) {
    try {
      const existing = await client.customers.get({ id: input.polarCustomerId });
      return existing.id;
    } catch (error) {
      if (!isPolarNotFound(error)) {
        throw mapPolarRequestError(error, "Could not load the Polar customer");
      }
    }
  }

  try {
    const existing = await client.customers.getExternal({
      externalId: input.accountId,
    });
    return existing.id;
  } catch (error) {
    if (!isPolarNotFound(error)) {
      throw mapPolarRequestError(error, "Could not load the Polar customer");
    }
  }

  if (!input.customerEmail) {
    throw new Error(
      "No Polar customer is connected yet. Checkout a plan first so Polar can create a billing customer.",
    );
  }

  try {
    const created = await client.customers.create({
      email: input.customerEmail,
      name: input.customerName ?? undefined,
      externalId: input.accountId,
      metadata: { account_id: input.accountId },
    });
    return created.id;
  } catch (error) {
    throw mapPolarRequestError(
      error,
      "Could not create a Polar customer for this workspace",
    );
  }
}

export async function createPolarCustomerPortalSession(input: {
  accountId: string;
  polarCustomerId?: string | null;
  customerEmail?: string | null;
  customerName?: string | null;
  returnUrl: string;
}): Promise<PolarCustomerPortalResult> {
  requireEnabledBilling();
  const polarCustomerId = await resolvePolarCustomerId(input);

  try {
    const session = await getPolarClient().customerSessions.create({
      customerId: polarCustomerId,
      returnUrl: input.returnUrl,
    });
    return { url: session.customerPortalUrl, polarCustomerId };
  } catch (error) {
    throw mapPolarRequestError(error, "Could not open the Polar customer portal");
  }
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

  try {
    await getPolarClient().subscriptions.update({
      id: input.subscriptionId,
      subscriptionUpdate: {
        productId: getBillingProductId(config, input.plan),
        prorationBehavior: "prorate",
      },
    });
  } catch (error) {
    throw mapPolarRequestError(error, "Could not update the Polar plan");
  }
}

export async function updatePolarSubscriptionSeats(input: {
  subscriptionId: string;
  seats: number;
}): Promise<void> {
  requireEnabledBilling();
  try {
    await getPolarClient().subscriptions.update({
      id: input.subscriptionId,
      subscriptionUpdate: {
        seats: input.seats,
        prorationBehavior: "prorate",
      },
    });
  } catch (error) {
    throw mapPolarRequestError(error, "Could not update Polar seats");
  }
}

export async function updatePolarSubscriptionCancellation(input: {
  subscriptionId: string;
  cancelAtPeriodEnd: boolean;
}): Promise<void> {
  requireEnabledBilling();
  try {
    await getPolarClient().subscriptions.update({
      id: input.subscriptionId,
      subscriptionUpdate: {
        cancelAtPeriodEnd: input.cancelAtPeriodEnd,
      },
    });
  } catch (error) {
    throw mapPolarRequestError(error, "Could not update Polar cancellation");
  }
}
