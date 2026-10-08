import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";

import { checkoutRenewalDisclosure } from "@/lib/billing/checkout-renewal";

describe("checkout renewal terms", () => {
  test("uses the pricing-card monthly per-seat prices", () => {
    const pricing = readFileSync(
      "src/components/marketing/sections/pricing-preview.tsx",
      "utf8",
    );
    expect(pricing).toContain('price: "$99"');
    expect(pricing).toContain('price: "$179"');
    expect(pricing).toContain('cadence: "/ SEAT / MO"');

    expect(checkoutRenewalDisclosure("starter")).toBe(
      "Starter is $99 per seat per month. It renews monthly per seat until canceled. Cancellation stops the next renewal.",
    );
    expect(checkoutRenewalDisclosure("team")).toBe(
      "Team is $179 per seat per month. It renews monthly per seat until canceled. Cancellation stops the next renewal.",
    );
  });

  test("billing controls show the disclosure beside checkout and leave scale disabled", () => {
    const controls = readFileSync(
      "src/app/(dashboard)/settings/billing/_components/billing-controls.tsx",
      "utf8",
    );
    expect(controls).toContain("checkoutRenewalDisclosure(plan)");
    expect(controls).toContain('plan === "starter" || plan === "team"');
    expect(controls).not.toMatch(/annual/i);
    expect(controls).toContain("Checkout is not available.");

    const catalog = readFileSync("src/lib/billing/entitlements.ts", "utf8");
    const scale = catalog.slice(catalog.indexOf("scale:"));
    expect(scale).toContain("checkoutEnabled: false");
  });
});