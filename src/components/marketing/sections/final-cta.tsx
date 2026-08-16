import Link from "next/link";

import { Reveal } from "@/components/marketing/motion/reveal";

const CTA_BADGES = [
  "14-DAY PILOT",
  "DATA MIGRATION INCLUDED",
  "NO ANNUAL LOCK-IN",
];

export function FinalCta() {
  return (
    <section
      id="cta"
      className="mkt-divider relative overflow-hidden bg-[var(--mkt-bg2)] text-[var(--mkt-text)]"
    >
      <div className="mkt-grid-bg pointer-events-none absolute inset-0" aria-hidden />

      <Reveal className="relative mx-auto flex max-w-[820px] flex-col items-center px-7 py-24 text-center sm:py-28">
        <span className="font-mono text-[10.5px] leading-none font-medium tracking-[0.1em] text-[var(--mkt-text3)]">
          10.0 — GET STARTED
        </span>
        <h2 className="mt-5 font-sans text-[clamp(34px,4vw,56px)] leading-[1.02] font-normal tracking-normal text-balance text-[var(--mkt-text)]">
          Work every lead like it&apos;s the only one.
        </h2>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-2.5">
          <Link
            href="/book-demo"
            className="rounded-md bg-[var(--mkt-accent)] px-5 py-3.5 font-sans text-sm leading-none font-medium text-[var(--mkt-accent-ink)] transition-[background,transform] duration-150 hover:bg-[var(--mkt-accent-hover)] active:translate-y-px"
          >
            Book a demo
          </Link>
          <a
            href="#pricing"
            className="rounded-md border border-[color:var(--mkt-border)] px-[18px] py-3.5 font-sans text-sm leading-none font-medium text-[var(--mkt-text)] transition-colors duration-150 hover:border-[color:var(--mkt-border-strong)] hover:bg-[var(--mkt-bg)]"
          >
            See pricing
          </a>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          {CTA_BADGES.map((badge) => (
            <span
              key={badge}
              className="rounded border border-[color:var(--mkt-border)] bg-[var(--mkt-surface)] px-2.5 py-1.5 font-mono text-[10px] leading-none font-medium tracking-[0.08em] text-[var(--mkt-text3)]"
            >
              {badge}
            </span>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
