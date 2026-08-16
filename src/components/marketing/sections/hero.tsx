import Link from "next/link";

import { MockBrowserFrame } from "@/components/marketing/mock/mock-browser-frame";
import { MARKETING_HERO_COPY } from "@/components/marketing/mock/mock-data";
import { MockLeadIntelPanel } from "@/components/marketing/mock/mock-lead-intel-panel";
import { MockLeadTable } from "@/components/marketing/mock/mock-lead-table";
import { Reveal } from "@/components/marketing/motion/reveal";

export function Hero() {
  return (
    <section
      id="top"
      className="mkt-divider relative overflow-hidden bg-[var(--mkt-bg)] text-[var(--mkt-text)]"
    >
      <div className="mkt-grid-bg pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative mx-auto max-w-[1240px] px-4 pt-28 sm:px-7 lg:pt-[104px]">
        <Reveal className="max-w-4xl">
          <div className="flex items-center gap-2.5">
            <span className="size-[5px] rounded-full bg-[var(--mkt-accent)]" />
            <span className="font-mono text-[10.5px] leading-none font-medium tracking-[0.1em] text-[var(--mkt-text3)] uppercase">
              {MARKETING_HERO_COPY.eyebrow}
            </span>
          </div>

          <h1 className="mt-6 max-w-[15ch] font-sans text-5xl leading-[0.99] font-normal tracking-[-0.038em] text-balance text-[var(--mkt-text)] sm:text-7xl">
            {MARKETING_HERO_COPY.title}
          </h1>

          <p className="mt-6 max-w-[46ch] font-sans text-lg leading-[1.55] font-light text-[var(--mkt-text2)] sm:text-[18.5px]">
            {MARKETING_HERO_COPY.subhead}
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-2.5">
            <Link
              href="/login"
              className="rounded-md bg-[var(--mkt-accent)] px-5 py-3.5 font-sans text-sm leading-none font-medium text-[var(--mkt-accent-ink)] transition-[background,transform] duration-150 hover:bg-[var(--mkt-accent-hover)] active:translate-y-px"
            >
              {MARKETING_HERO_COPY.primaryCta}
            </Link>
            <a
              href="#ch1"
              className="rounded-md border border-[color:var(--mkt-border)] px-[18px] py-3.5 font-sans text-sm leading-none font-medium text-[var(--mkt-text)] transition-colors duration-150 hover:border-[color:var(--mkt-border-strong)] hover:bg-[var(--mkt-bg2)]"
            >
              {MARKETING_HERO_COPY.secondaryCta}
            </a>
            <span className="font-mono text-[12.5px] leading-none text-[var(--mkt-text3)] sm:ml-1.5">
              {MARKETING_HERO_COPY.note}
            </span>
          </div>
        </Reveal>

        <div className="mt-16 flex items-end justify-between gap-5 pb-2.5">
          <span className="font-mono text-[10.5px] leading-none font-medium tracking-[0.1em] text-[var(--mkt-text3)]">
            FIG 0.1 — LEAD LIFECYCLE, ONE SURFACE
          </span>
          <span className="hidden font-mono text-[10.5px] leading-none tracking-[0.06em] text-[var(--mkt-text3)] md:block">
            app.vesperwisecrm.com / queue
          </span>
        </div>
      </div>

      <div className="relative mx-auto max-w-[1240px] px-4 sm:px-7">
        <Reveal delay={0.15}>
          <MockBrowserFrame
            title={MARKETING_HERO_COPY.browserTitle}
            className="rounded-b-none rounded-t-[14px] border-b-0"
            style={{
              boxShadow:
                "0 32px 90px color-mix(in oklch, var(--mkt-text) 14%, transparent)",
            }}
            actions={
              <>
                <span className="rounded-[5px] border border-[color:var(--mkt-border-subtle)] px-2 py-1.5 font-mono text-[11px] leading-none text-[var(--mkt-text3)]">
                  Motivation ≥ 70
                </span>
                <span className="rounded-[5px] bg-[var(--mkt-accent)] px-2 py-1.5 font-mono text-[11px] leading-none text-[var(--mkt-accent-ink)]">
                  Unworked · 12
                </span>
              </>
            }
          >
            <div className="grid min-w-0 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-w-0 border-b border-[color:var(--mkt-border-subtle)] lg:border-r lg:border-b-0">
                <MockLeadTable />
              </div>
              <MockLeadIntelPanel />
            </div>
          </MockBrowserFrame>
        </Reveal>
      </div>
    </section>
  );
}
