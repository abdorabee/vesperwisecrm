import type { Metadata } from "next";

import { MarketingContentPage } from "@/components/marketing/marketing-content-page";
import {
  MARKETING_PAGES,
  type MarketingPageContent,
  type MarketingPageSlug,
} from "@/components/marketing/content/pages";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://vesperwisecrm.vercel.app";

export function marketingContentMetadata(page: MarketingPageContent): Metadata {
  return {
    metadataBase: new URL(SITE_URL),
    title: `${page.title} — VesperWise CRM`,
    description: page.description,
    alternates: { canonical: page.href },
  };
}

export function contentRoute(slug: MarketingPageSlug) {
  const page = MARKETING_PAGES[slug];
  return {
    metadata: marketingContentMetadata(page),
    Page: function MarketingRoutePage() {
      return <MarketingContentPage page={page} />;
    },
  };
}
