import Link from "next/link";
import type { ReactNode } from "react";

import { Reveal } from "@/components/marketing/motion/reveal";
import { cn } from "@/lib/utils";

interface MarketingPageShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
  cta?: { label: string; href: string };
  className?: string;
}

export function MarketingPageShell({
  eyebrow,
  title,
  description,
  children,
  cta,
  className,
}: MarketingPageShellProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden bg-[var(--mkt-bg)] text-[var(--mkt-text)]",
        className,
      )}
    >
      <div className="mkt-grid-bg pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-[1240px] px-4 pt-28 pb-20 sm:px-7 lg:pt-[104px] lg:pb-28">
        <Reveal className="max-w-[62ch]">
          <span className="font-mono text-[10.5px] leading-none font-medium tracking-[0.1em] text-[var(--mkt-text3)] uppercase">
            {eyebrow}
          </span>
          <h1 className="mt-5 font-sans text-[clamp(34px,4.4vw,56px)] leading-[1.02] font-normal tracking-[-0.03em] text-balance text-[var(--mkt-text)]">
            {title}
          </h1>
          <p className="mt-5 max-w-[54ch] font-sans text-lg leading-[1.55] font-light text-[var(--mkt-text2)]">
            {description}
          </p>
          {cta ? (
            <Link
              href={cta.href}
              className="mt-8 inline-flex rounded-md bg-[var(--mkt-accent)] px-5 py-3.5 font-sans text-sm leading-none font-medium text-[var(--mkt-accent-ink)] transition-[background,transform] duration-150 hover:bg-[var(--mkt-accent-hover)] active:translate-y-px"
            >
              {cta.label}
            </Link>
          ) : null}
        </Reveal>
        {children ? <div className="relative mt-14">{children}</div> : null}
      </div>
    </section>
  );
}
