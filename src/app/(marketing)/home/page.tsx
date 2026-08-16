import type { Metadata } from "next";

import { Automate } from "@/components/marketing/sections/automate";
import { Comparison } from "@/components/marketing/sections/comparison";
import { Engage } from "@/components/marketing/sections/engage";
import { FinalCta } from "@/components/marketing/sections/final-cta";
import { Hero } from "@/components/marketing/sections/hero";
import { Intake } from "@/components/marketing/sections/intake";
import { Pipeline } from "@/components/marketing/sections/pipeline";
import { Premise } from "@/components/marketing/sections/premise";
import { PricingPreview } from "@/components/marketing/sections/pricing-preview";
import { ProofStrip } from "@/components/marketing/sections/proof-strip";
import { Qualify } from "@/components/marketing/sections/qualify";
import { Testimonials } from "@/components/marketing/sections/testimonials";
import { Understand } from "@/components/marketing/sections/understand";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://vesperwisecrm.vercel.app";

const PAGE_TITLE =
  "VesperWise CRM — Every Lead Worked. Nothing Goes Cold.";
const PAGE_DESCRIPTION =
  "Built for real estate acquisition teams: intake, skip tracing, AI qualification, dialer, and pipeline in one CRM so every seller conversation moves forward.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/home" },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: "/home",
    siteName: "VesperWise CRM",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "VesperWise CRM",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: PAGE_DESCRIPTION,
  url: `${SITE_URL}/home`,
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <Hero />
      <ProofStrip />
      <Premise />
      <Intake />
      <Qualify />
      <Engage />
      <Pipeline />
      <Automate />
      <Understand />
      <Comparison />
      <Testimonials />
      <PricingPreview />
      <FinalCta />
    </>
  );
}
