import type { ComponentType } from "react";

import {
  CaptureFigure,
  CloseFigure,
  QualifyFigure,
} from "@/components/marketing/figures/step-figures";
import {
  MARKETING_PREMISE_COPY,
  MARKETING_PREMISE_STEPS,
} from "@/components/marketing/mock/mock-data";
import { Reveal } from "@/components/marketing/motion/reveal";
import { Stagger, StaggerItem } from "@/components/marketing/motion/stagger";
import { cn } from "@/lib/utils";

interface PremiseFigureProps {
  className?: string;
}

const FIGURES: ComponentType<PremiseFigureProps>[] = [
  CaptureFigure,
  QualifyFigure,
  CloseFigure,
];

export function Premise() {
  return (
    <section className="mkt-divider bg-[var(--mkt-bg)] text-[var(--mkt-text)]">
      <div className="mx-auto max-w-[1240px] px-4 py-24 sm:px-7 lg:py-[104px]">
        <Reveal className="max-w-[62ch]">
          <span className="font-mono text-[10.5px] leading-none font-medium tracking-[0.1em] text-[var(--mkt-text3)]">
            {MARKETING_PREMISE_COPY.eyebrow}
          </span>
          <h2 className="mt-5 font-sans text-3xl leading-[1.1] font-normal tracking-[-0.03em] text-balance text-[var(--mkt-text)] sm:text-[46px]">
            {MARKETING_PREMISE_COPY.title}
          </h2>
          <p className="mt-5 max-w-[52ch] font-sans text-[17px] leading-[1.6] font-light text-[var(--mkt-text2)]">
            {MARKETING_PREMISE_COPY.body}
          </p>
        </Reveal>

        <Stagger className="mt-14 grid grid-cols-1 border-t border-[color:var(--mkt-border)] md:grid-cols-3">
          {MARKETING_PREMISE_STEPS.map((step, index) => {
            const Figure = FIGURES[index];

            return (
              <StaggerItem
                key={step.label}
                className={cn(
                  "flex flex-col border-b border-[color:var(--mkt-border-subtle)] py-6 md:border-b-0",
                  index === 0 ? "md:pr-8" : "md:px-8",
                  index < MARKETING_PREMISE_STEPS.length - 1
                    ? "md:border-r md:border-[color:var(--mkt-border-subtle)]"
                    : "md:pl-8",
                )}
              >
                <span className="font-mono text-[10.5px] leading-none font-medium tracking-[0.1em] text-[var(--mkt-text3)]">
                  {step.figureLabel}
                </span>
                <div className="py-5 sm:py-6">
                  <Figure className="block h-auto w-full" />
                </div>
                <div className="mt-auto flex items-baseline gap-2.5">
                  <span className="rounded-[3px] bg-[var(--mkt-accent)] px-1.5 py-1 font-mono text-[10.5px] leading-none font-medium tracking-[0.08em] text-[var(--mkt-accent-ink)]">
                    {step.number}
                  </span>
                  <span className="font-sans text-[15px] leading-none font-medium tracking-[-0.01em] text-[var(--mkt-text)]">
                    {step.label}
                  </span>
                </div>
                <p className="mt-3.5 max-w-[30ch] font-sans text-[14.5px] leading-[1.55] font-light text-[var(--mkt-text2)]">
                  {step.caption}
                </p>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
}
