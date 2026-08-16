import type { Metadata } from "next";

import { BookDemoCalendar } from "@/components/marketing/book-demo-calendar";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://vesperwisecrm.vercel.app";

const TITLE = "Book a demo — VesperWise CRM";
const DESCRIPTION =
  "Pick a weekday slot for a 30-minute walkthrough of intake, skip tracing, the queue, and the dialer. No card required.";

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
