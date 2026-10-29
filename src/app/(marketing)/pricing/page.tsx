import type { Metadata } from "next";
import Link from "next/link";

import { Reveal } from "@/components/marketing/motion/reveal";
import { publicSiteOrigin } from "@/lib/marketing/site-url";

const SITE_URL = publicSiteOrigin();

const foundingCheckoutUrl =
  process.env.NEXT_PUBLIC_POLAR_FOUNDING_CHECKOUT_URL?.trim() || "";

const OFFER_LINES = [
  "Founding license: $600 once. 5 spots.",
  "Includes done-for-you setup, 5 seats, and every future update.",
  "Full refund if you cancel within your first month.",
] as const;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Pricing",
  description: OFFER_LINES[0],
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  const checkoutHref = foundingCheckoutUrl || "/signup";

  return (
    <section className="relative overflow-hidden bg-[var(--mkt-bg)] text-[var(--mkt-text)]">
      <div className="mkt-grid-bg pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-[1240px] px-4 pt-28 pb-20 sm:px-7 lg:pt-[104px] lg:pb-28">
        <Reveal className="max-w-[62ch]">
          <span className="font-mono text-[10.5px] leading-none font-medium tracking-[0.1em] text-[var(--mkt-text3)] uppercase">
            Pricing
          </span>
          <h1 className="mt-5 font-sans text-[clamp(34px,4.4vw,56px)] leading-[1.02] font-normal tracking-[-0.03em] text-balance text-[var(--mkt-text)]">
            {OFFER_LINES[0]}
          </h1>
          <ul className="mt-5 max-w-[54ch] list-none space-y-3 font-sans text-lg leading-[1.55] font-light text-[var(--mkt-text2)]">
            {OFFER_LINES.slice(1).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap items-center gap-2.5">
            <Link
              href={checkoutHref}
              className="rounded-md bg-[var(--mkt-accent)] px-5 py-3.5 font-sans text-sm leading-none font-medium text-[var(--mkt-accent-ink)] transition-[background,transform] duration-150 hover:bg-[var(--mkt-accent-hover)] active:translate-y-px"
            >
              Claim a founding spot
            </Link>
            <Link
              href="/book-demo"
              className="rounded-md border border-[color:var(--mkt-border)] px-[18px] py-3.5 font-sans text-sm leading-none font-medium text-[var(--mkt-text)] transition-colors duration-150 hover:border-[color:var(--mkt-border-strong)] hover:bg-[var(--mkt-bg2)]"
            >
              Book a 15-min call
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
