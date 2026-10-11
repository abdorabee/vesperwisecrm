import type { Metadata } from "next";

import { BookDemoCalendar } from "@/components/marketing/book-demo-calendar";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://vesperwisecrm.vercel.app";

const TITLE = "Book a demo — VesperWise CRM";
const DESCRIPTION =
  "Pick a weekday slot for a 15-minute call: we load 3 to 5 of your sellers into a pipeline live. No card required.";

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
      title="A 15-minute call. We load your sellers into a pipeline."
      description={DESCRIPTION}
    >
      <BookDemoCalendar />
    </MarketingPageShell>
  );
}
