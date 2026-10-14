import type { Metadata } from "next";

import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://vesperwisecrm.vercel.app";

const foundingCheckoutUrl =
  process.env.NEXT_PUBLIC_POLAR_FOUNDING_CHECKOUT_URL?.trim() || "";

const DESCRIPTION = "The founding offer is $600.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Pricing",
  description: DESCRIPTION,
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  return (
    <MarketingPageShell
      eyebrow="Pricing"
      title="The founding offer is $600."
      description="Checkout for the founding offer is on Polar."
      cta={{
        label: foundingCheckoutUrl ? "Checkout on Polar" : "Sign up",
        href: foundingCheckoutUrl || "/signup",
      }}
    />
  );
}
