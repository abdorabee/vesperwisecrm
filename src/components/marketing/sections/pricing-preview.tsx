import Link from "next/link";

import { Reveal } from "@/components/marketing/motion/reveal";

export function PricingPreview() {
  return (
    <section
      id="pricing"
      className="mkt-divider scroll-mt-24 bg-[var(--mkt-bg)] text-[var(--mkt-text)]"
    >
      <div className="mx-auto max-w-[1240px] px-7 py-24 sm:py-28">
        <Reveal className="max-w-[54ch]">
          <span className="font-mono text-[10.5px] leading-none font-medium tracking-[0.1em] text-[var(--mkt-text3)]">
            9.0 — PRICING
          </span>
          <h2 className="mt-5 font-sans text-[clamp(30px,3.4vw,44px)] leading-[1.05] font-normal tracking-normal text-balance text-[var(--mkt-text)]">
            Pricing is shown on our pricing page
          </h2>
          <Link
            href="/pricing"
            className="mt-8 inline-flex h-11 items-center justify-center rounded-md bg-[var(--mkt-accent)] px-4 font-sans text-sm leading-none font-medium text-[var(--mkt-accent-ink)] transition-[background,transform] duration-150 hover:bg-[var(--mkt-accent-hover)] active:translate-y-px"
          >
            See pricing
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
