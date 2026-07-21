import { Brain, PhoneCall, Zap } from "lucide-react";

import { Stagger, StaggerItem } from "@/components/marketing/motion/stagger";
import { SectionHeading } from "@/components/marketing/section-heading";

export function AiSection() {
  return (
    <section id="ai" className="scroll-mt-24 py-24 sm:py-32">
      <div className="mx-auto flex max-w-6xl flex-col gap-14 px-4 sm:px-6">
        <SectionHeading
          eyebrow="AI inside"
          title="AI that scores leads and writes the notes."
          subcopy="VesperWise reads every lead and every call so your team spends its time talking to sellers, not typing."
        />

        <Stagger className="grid gap-4 lg:grid-cols-3">
          <StaggerItem className="flex flex-col gap-5 rounded-xl bg-card p-6 ring-1 ring-foreground/10">
            <span className="flex size-10 items-center justify-center rounded-lg surface-subtle ring-1 ring-foreground/10">
              <Brain className="size-4.5 text-accent-foreground" />
            </span>
            <div className="flex flex-col gap-2">
              <h3 className="font-medium">AI lead scoring</h3>
              <p className="text-sm text-muted-foreground">
                Every lead gets a 0–100 score the moment it arrives, so the
                first call of the day is always the best one.
              </p>
            </div>
            <div className="mt-auto flex flex-wrap gap-2" aria-hidden>
              <span className="rounded-full border border-[color:var(--hot-border)] bg-hot-subtle px-2.5 py-1 text-xs font-medium text-hot tabular-nums">
                92 · Hot
              </span>
              <span className="rounded-full border border-[color:var(--warm-border)] bg-warm-subtle px-2.5 py-1 text-xs font-medium text-warm tabular-nums">
                64 · Warm
              </span>
              <span className="rounded-full border border-[color:var(--cold-border)] bg-cold-subtle px-2.5 py-1 text-xs font-medium text-cold tabular-nums">
                22 · Cold
              </span>
            </div>
          </StaggerItem>

          <StaggerItem className="flex flex-col gap-5 rounded-xl bg-card p-6 ring-1 ring-foreground/10">
            <span className="flex size-10 items-center justify-center rounded-lg surface-subtle ring-1 ring-foreground/10">
              <PhoneCall className="size-4.5 text-accent-foreground" />
            </span>
            <div className="flex flex-col gap-2">
              <h3 className="font-medium">AI call summaries</h3>
              <p className="text-sm text-muted-foreground">
                Call recordings become structured summaries — motivation, price,
                timeline — logged to the lead automatically.
              </p>
            </div>
            <div
              className="mt-auto rounded-lg surface-quiet p-3 font-mono text-[11px] leading-relaxed text-muted-foreground"
              aria-hidden
            >
              <p className="text-foreground/80">Summary · 6 min call</p>
              <p>Seller motivated — relocating in 60 days.</p>
              <p>Asking $85k, flexible on close date.</p>
              <p className="text-hot">Next: send comps by Thursday.</p>
            </div>
          </StaggerItem>

          <StaggerItem className="flex flex-col gap-5 rounded-xl bg-card p-6 ring-1 ring-foreground/10">
            <span className="flex size-10 items-center justify-center rounded-lg surface-subtle ring-1 ring-foreground/10">
              <Zap className="size-4.5 text-accent-foreground" />
            </span>
            <div className="flex flex-col gap-2">
              <h3 className="font-medium">Auto-qualification</h3>
              <p className="text-sm text-muted-foreground">
                Workflows route hot leads to your closers, drop cold ones into
                nurture, and keep the queue clean without a human touch.
              </p>
            </div>
            <div className="mt-auto flex flex-col gap-1.5" aria-hidden>
              <div className="flex items-center gap-2 rounded-lg surface-quiet px-3 py-2 text-xs">
                <span className="size-1.5 rounded-full bg-hot" />
                Score ≥ 80 → assign to closer
              </div>
              <div className="flex items-center gap-2 rounded-lg surface-quiet px-3 py-2 text-xs">
                <span className="size-1.5 rounded-full bg-cold" />
                Score &lt; 40 → nurture sequence
              </div>
            </div>
          </StaggerItem>
        </Stagger>
      </div>
    </section>
  );
}
