import type { BillingPlan } from "@/lib/billing/entitlements";

export type BillingMode = "sandbox" | "production";

export interface BillingConfig {
  enabled: boolean;
  mode: BillingMode;
  accessToken: string | null;
  webhookSecret: string | null;
  productIds: Record<BillingPlan, string | null>;
  scaleCheckoutEnabled: boolean;
}

const REQUIRED_BILLING_VARS = [
  "POLAR_ACCESS_TOKEN",
  "POLAR_WEBHOOK_SECRET",
  "POLAR_STARTER_PRODUCT_ID",
  "POLAR_TEAM_PRODUCT_ID",
] as const;

function configuredMode(): BillingMode {
  const value = process.env.POLAR_MODE ?? process.env.POLAR_ENVIRONMENT ?? "sandbox";
  if (value !== "sandbox" && value !== "production") {
    throw new Error("POLAR_ENVIRONMENT must be sandbox or production");
  }
  return value;
}

export function getBillingConfig(): BillingConfig {
  const providerConfigured = REQUIRED_BILLING_VARS.some((key) => Boolean(process.env[key]?.trim()));
  const enabled =
    process.env.POLAR_BILLING_ENABLED === "true" ||
    (process.env.POLAR_BILLING_ENABLED !== "false" && providerConfigured);
  const mode = configuredMode();
  const productIds: Record<BillingPlan, string | null> = {
    starter: process.env.POLAR_STARTER_PRODUCT_ID?.trim() || null,
    team: process.env.POLAR_TEAM_PRODUCT_ID?.trim() || null,
    scale: process.env.POLAR_SCALE_PRODUCT_ID?.trim() || null,
  };

  if (!enabled) {
    return {
      enabled: false,
      mode,
      accessToken: null,
      webhookSecret: null,
      productIds,
      scaleCheckoutEnabled: false,
    };
  }

  const missing = REQUIRED_BILLING_VARS.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(
      `Polar billing is enabled but missing: ${missing.join(", ")}`,
    );
  }

  const scaleCheckoutEnabled = process.env.POLAR_SCALE_CHECKOUT_ENABLED === "true";
  if (scaleCheckoutEnabled && !productIds.scale) {
    throw new Error(
      "Scale checkout is enabled but missing: POLAR_SCALE_PRODUCT_ID",
    );
  }

  return {
    enabled: true,
    mode,
    accessToken: process.env.POLAR_ACCESS_TOKEN!.trim(),
    webhookSecret: process.env.POLAR_WEBHOOK_SECRET!.trim(),
    productIds,
    scaleCheckoutEnabled,
  };
}

export function getBillingProductId(
  config: BillingConfig,
  plan: BillingPlan,
): string {
  const productId = config.productIds[plan];
  if (!productId) {
    throw new Error(`Polar product ID is not configured for ${plan}`);
  }
  return productId;
}
