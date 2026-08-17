import type { BillingPlan } from "@/lib/billing/entitlements";

export interface PolarCheckoutRequestInput {
  productId: string;
  accountId: string;
  plan: BillingPlan;
  seats: number;
  includeSeats: boolean;
  customerEmail?: string | null;
  customerName?: string | null;
  successUrl: string;
  returnUrl: string;
}

export function productHasSeatBasedPrice(product: {
  prices?: Array<{ amountType?: string | null } | null> | null;
}): boolean {
  return (product.prices ?? []).some((price) => price?.amountType === "seat_based");
}

export function buildPolarCheckoutCreate(input: PolarCheckoutRequestInput) {
  return {
    products: [input.productId],
    ...(input.includeSeats ? { seats: input.seats } : {}),
    externalCustomerId: input.accountId,
    customerEmail: input.customerEmail ?? undefined,
    customerName: input.customerName ?? undefined,
    metadata: {
      account_id: input.accountId,
      plan: input.plan,
    },
    successUrl: input.successUrl,
    returnUrl: input.returnUrl,
  };
}
