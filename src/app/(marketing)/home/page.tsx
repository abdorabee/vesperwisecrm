import type { Metadata } from "next";

import { AiSection } from "@/components/marketing/sections/ai-section";
import { DashboardGallery } from "@/components/marketing/sections/dashboard-gallery";
import { FinalCta } from "@/components/marketing/sections/final-cta";
import { Hero } from "@/components/marketing/sections/hero";
import { MetricsStrip } from "@/components/marketing/sections/metrics-strip";
import { PricingPreview } from "@/components/marketing/sections/pricing-preview";
import { ProductShowcase } from "@/components/marketing/sections/product-showcase";
import { Testimonials } from "@/components/marketing/sections/testimonials";
import { WhyVesperwise } from "@/components/marketing/sections/why-vesperwise";
import { WorkflowViz } from "@/components/marketing/sections/workflow-viz";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://vesperwisecrm.vercel.app";

const PAGE_TITLE =
  "VesperWise CRM — Acquisition-Pipeline CRM for Wholesalers & Cold-Calling Teams";
const PAGE_DESCRIPTION =
  "Lead intake, AI qualification, and automated email & SMS follow-up in one place. VesperWise is the acquisition-pipeline CRM that never lets a lead go cold.";

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
      <MetricsStrip />
      <ProductShowcase />
      <AiSection />
      <WorkflowViz />
      <DashboardGallery />
      <WhyVesperwise />
      <Testimonials />
      <PricingPreview />
      <FinalCta />
    </>
  );
}
