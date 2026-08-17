import { describe, expect, it } from "vitest";

import {
  buildPolarCheckoutCreate,
  productHasSeatBasedPrice,
} from "@/lib/billing/polar-checkout";

describe("polar checkout payload", () => {
  const base = {
    productId: "prod_starter",
    accountId: "account_123",
    plan: "starter" as const,
    seats: 3,
    customerEmail: "owner@example.com",
    customerName: "Acme",
    successUrl: "https://vesperwisecrm.com/settings/billing?checkout=success",
    returnUrl: "https://vesperwisecrm.com/settings/billing",
  };

  it("omits seats for fixed-price Polar products", () => {
    expect(productHasSeatBasedPrice({ prices: [{ amountType: "fixed" }] })).toBe(false);

    const payload = buildPolarCheckoutCreate({ ...base, includeSeats: false });

    expect(payload).toMatchObject({
      products: ["prod_starter"],
      externalCustomerId: "account_123",
      customerEmail: "owner@example.com",
    });
    expect(payload).not.toHaveProperty("seats");
  });

  it("includes seats only for seat-based Polar products", () => {
    expect(productHasSeatBasedPrice({ prices: [{ amountType: "seat_based" }] })).toBe(true);

    expect(buildPolarCheckoutCreate({ ...base, includeSeats: true })).toMatchObject({
      products: ["prod_starter"],
      seats: 3,
      externalCustomerId: "account_123",
      metadata: { account_id: "account_123", plan: "starter" },
    });
  });
});
