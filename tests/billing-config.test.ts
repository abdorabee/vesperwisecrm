import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getBillingConfig,
  getBillingProductId,
  type BillingConfig,
} from "@/lib/billing/config";

afterEach(() => {
  vi.unstubAllEnvs();
});

function enabledEnvironment(): void {
  vi.stubEnv("POLAR_BILLING_ENABLED", "true");
  vi.stubEnv("POLAR_ACCESS_TOKEN", "polar_oat_test");
  vi.stubEnv("POLAR_WEBHOOK_SECRET", "whsec_test");
  vi.stubEnv("POLAR_STARTER_PRODUCT_ID", "starter-product");
  vi.stubEnv("POLAR_TEAM_PRODUCT_ID", "team-product");
  vi.stubEnv("POLAR_SCALE_PRODUCT_ID", "scale-product");
  vi.stubEnv("POLAR_MODE", "sandbox");
}

describe("billing configuration", () => {
  it("keeps billing disabled when the feature flag is off", () => {
    vi.stubEnv("POLAR_BILLING_ENABLED", "false");

    const config = getBillingConfig();

    expect(config.enabled).toBe(false);
    expect(config.scaleCheckoutEnabled).toBe(false);
  });

  it("loads all provider credentials and product mappings when enabled", () => {
    enabledEnvironment();

    const config: BillingConfig = getBillingConfig();

    expect(config).toMatchObject({
      enabled: true,
      mode: "sandbox",
      accessToken: "polar_oat_test",
      webhookSecret: "whsec_test",
      scaleCheckoutEnabled: false,
    });
    expect(getBillingProductId(config, "starter")).toBe("starter-product");
    expect(getBillingProductId(config, "team")).toBe("team-product");
    expect(getBillingProductId(config, "scale")).toBe("scale-product");
  });

  it("allows Starter and Team billing while Scale checkout is disabled", () => {
    enabledEnvironment();
    vi.stubEnv("POLAR_SCALE_PRODUCT_ID", "");

    const config = getBillingConfig();

    expect(config.enabled).toBe(true);
    expect(config.productIds.scale).toBeNull();
    expect(config.scaleCheckoutEnabled).toBe(false);
  });

  it("rejects enabled billing when a secret or product mapping is missing", () => {
    enabledEnvironment();
    vi.stubEnv("POLAR_WEBHOOK_SECRET", "");

    expect(() => getBillingConfig()).toThrow(
      "Polar billing is enabled but missing: POLAR_WEBHOOK_SECRET",
    );
  });

  it("rejects Scale checkout when it is enabled without a Scale product", () => {
    enabledEnvironment();
    vi.stubEnv("POLAR_SCALE_PRODUCT_ID", "");
    vi.stubEnv("POLAR_SCALE_CHECKOUT_ENABLED", "true");

    expect(() => getBillingConfig()).toThrow(
      "Scale checkout is enabled but missing: POLAR_SCALE_PRODUCT_ID",
    );
  });
});
