import Link from "next/link";
import { Check } from "lucide-react";

import { Stagger, StaggerItem } from "@/components/marketing/motion/stagger";
import { Reveal } from "@/components/marketing/motion/reveal";
import { cn } from "@/lib/utils";

interface MarketingPricingTier {
  name: string;
  price: string;
  cadence: string;
  badge?: string;
  blurb: string;
  features: string[];
  cta: string;
  href: string;
  highlighted?: boolean;
}

const PRICING_TIERS: MarketingPricingTier[] = [
  {
    name: "Starter",
    price: "$99",
    cadence: "/ SEAT / MO",
    blurb: "For solo investors and two-person teams getting off spreadsheets.",
    features: [
      "Lead queue + pipeline",
      "Email sequences",
      "Contact management",
      "1,000 leads / mo",
    ],
    cta: "Start pilot",
    href: "/signup",
  },
  {
    name: "Team",
    price: "$179",
    cadence: "/ SEAT / MO",
    badge: "MOST COMMON",
    blurb:
      "For acquisition teams running paid channels and cold lists side by side.",
    features: [
      "Workflows and routing",
      "Team roles & permissions",
      "Advanced pipeline views",
      "Unlimited leads",
    ],
    cta: "Book a demo",
    href: "/book-demo",
    highlighted: true,
  },
  {
    name: "Scale",
    price: "Custom",
    cadence: "ANNUAL",
    blurb:
      "For multi-market operations with dispositions and in-house closing.",
    features: [
      "Multi-market reporting",
      "API and data warehouse sync",
      "SSO and audit log",
      "Dedicated onboarding",
    ],
    cta: "Talk to sales",
    href: "/contact",
  },
];

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
            Per seat. Everything included.
          </h2>
        </Reveal>

        <Stagger className="mt-12 grid gap-4 lg:grid-cols-3 lg:items-start">
          {PRICING_TIERS.map((tier) => (
            <StaggerItem
              key={tier.name}
              className={cn(
                "relative flex h-full flex-col rounded-[14px] border p-6 transition-transform duration-200 hover:-translate-y-1 sm:p-8",
                tier.highlighted
                  ? "border-[color:var(--mkt-accent)] bg-[var(--mkt-raised)] shadow-[0_24px_70px_color-mix(in_oklch,var(--mkt-text)_10%,transparent)] lg:-translate-y-3"
                  : "border-[color:var(--mkt-border)] bg-[var(--mkt-surface)]",
              )}
            >
              {tier.badge ? (
                <span className="absolute -top-2.5 left-6 rounded-[5px] bg-[var(--mkt-accent)] px-2.5 py-1 font-mono text-[10px] leading-none font-medium tracking-[0.08em] text-[var(--mkt-accent-ink)]">
                  {tier.badge}
                </span>
              ) : null}

              <div>
                <h3 className="font-sans text-[18px] leading-none font-medium text-[var(--mkt-text)]">
                  {tier.name}
                </h3>
                <p className="mt-4 min-h-[3.6em] font-sans text-[14.5px] leading-[1.5] font-light text-[var(--mkt-text2)]">
                  {tier.blurb}
                </p>
              </div>

              <div className="mt-8 flex items-baseline gap-2">
                <span className="font-sans text-[44px] leading-none font-normal tracking-[-0.03em] text-[var(--mkt-text)] tabular-nums">
                  {tier.price}
                </span>
                <span className="font-mono text-[11px] leading-none font-medium tracking-[0.08em] text-[var(--mkt-text3)]">
                  {tier.cadence}
                </span>
              </div>

              <ul className="mt-8 flex flex-1 flex-col gap-3">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2.5 font-sans text-[14px] leading-[1.45] text-[var(--mkt-text2)]"
                  >
                    <Check className="mt-0.5 size-4 shrink-0 text-[var(--mkt-accent)]" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href={tier.href}
                className={cn(
                  "mt-8 flex h-11 items-center justify-center rounded-md px-4 font-sans text-sm leading-none font-medium transition-[background,border-color,transform] duration-150 active:translate-y-px",
                  tier.highlighted
                    ? "bg-[var(--mkt-accent)] text-[var(--mkt-accent-ink)] hover:bg-[var(--mkt-accent-hover)]"
                    : "border border-[color:var(--mkt-border)] text-[var(--mkt-text)] hover:border-[color:var(--mkt-border-strong)] hover:bg-[var(--mkt-bg2)]",
                )}
              >
                {tier.cta}
              </Link>
            </StaggerItem>
          ))}
        </Stagger>

        <p className="mt-6 max-w-[78ch] font-mono text-[10.5px] leading-[1.6] tracking-[0.04em] text-[var(--mkt-text3)]">
          Annual billing available. Early access pricing shown — subject to change before general availability.
        </p>
      </div>
    </section>
  );
}
