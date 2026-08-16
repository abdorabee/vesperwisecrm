import { Stagger, StaggerItem } from "@/components/marketing/motion/stagger";
import { Reveal } from "@/components/marketing/motion/reveal";

interface MarketingTestimonial {
  quote: string;
  attribution: string;
}

const TESTIMONIALS: MarketingTestimonial[] = [
  {
    quote:
      "The queue tells the team who to call and why. That decision used to eat the first hour of every morning.",
    attribution: "PLACEHOLDER · ACQUISITIONS MANAGER",
  },
  {
    quote:
      "Call summaries mean a lead can change hands without losing the context of the conversation.",
    attribution: "PLACEHOLDER · TEAM LEAD",
  },
  {
    quote:
      "We stopped losing revived leads. The ninety-day nurture rule pays for the software on its own.",
    attribution: "PLACEHOLDER · OWNER",
  },
];

export function Testimonials() {
  return (
    <section className="mkt-divider bg-[var(--mkt-bg2)] text-[var(--mkt-text)]">
      <div className="mx-auto max-w-[1240px] px-7 py-24 sm:py-28">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-[10.5px] leading-none font-medium tracking-[0.1em] text-[var(--mkt-text3)]">
                8.0 — FROM THE FIELD
              </span>
              <span className="rounded border border-dashed border-[color:var(--mkt-border)] px-2 py-1.5 font-mono text-[10px] leading-none text-[var(--mkt-text3)]">
                PLACEHOLDER — REPLACE WITH ATTRIBUTED QUOTES
              </span>
            </div>
            <h2 className="mt-5 max-w-[13ch] font-sans text-[clamp(30px,3.4vw,44px)] leading-[1.05] font-normal tracking-normal text-balance text-[var(--mkt-text)]">
              What the floor sounds like after the switch.
            </h2>
          </div>
        </Reveal>

        <Stagger className="mt-12 grid gap-4 lg:grid-cols-3">
          {TESTIMONIALS.map((testimonial) => (
            <StaggerItem
              key={testimonial.attribution}
              className="flex h-full flex-col justify-between gap-8 rounded-[14px] border border-[color:var(--mkt-border)] bg-[var(--mkt-surface)] p-6 shadow-[0_18px_50px_color-mix(in_oklch,var(--mkt-text)_6%,transparent)]"
            >
              <blockquote className="font-sans text-[15px] leading-[1.65] font-light text-[var(--mkt-text)]">
                &ldquo;{testimonial.quote}&rdquo;
              </blockquote>
              <figcaption className="flex items-center gap-2.5 border-t border-[color:var(--mkt-border-subtle)] pt-4">
                <span className="size-[5px] rounded-full bg-[var(--mkt-accent)]" />
                <span className="font-mono text-[10.5px] leading-none font-medium tracking-[0.08em] text-[var(--mkt-text3)]">
                  {testimonial.attribution}
                </span>
              </figcaption>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
