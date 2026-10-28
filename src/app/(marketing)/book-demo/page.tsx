import type { Metadata } from "next";

import { BookDemoCalendar } from "@/components/marketing/book-demo-calendar";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { publicSiteOrigin } from "@/lib/marketing/site-url";

const SITE_URL = publicSiteOrigin();

const TITLE = "Book a demo — VesperWise CRM";
const DESCRIPTION =
  "Pick a weekday slot for a 30-minute walkthrough of intake, the queue, and the pipeline. No card required.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/book-demo" },
};

export default function BookDemoPage() {
  return (
    <MarketingPageShell
      eyebrow="Get started / Book a demo"
      title="See the system on a live walkthrough."
      description={DESCRIPTION}
    >
      <BookDemoCalendar />
    </MarketingPageShell>
  );
}
