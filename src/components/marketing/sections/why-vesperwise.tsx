import { Check, X } from "lucide-react";

import { Reveal } from "@/components/marketing/motion/reveal";
import { SectionHeading } from "@/components/marketing/section-heading";

interface ComparisonRow {
  before: string;
  after: string;
}

const COMPARISON_ROWS: ComparisonRow[] = [
  {
    before: "Leads sit in inboxes and spreadsheets until someone remembers",
    after: "Every lead lands in one queue with a score and a next action",
  },
  {
    before: "Follow-up happens when someone has time — usually never",
    after: "Sequences send the 3rd, 4th, and 5th touch automatically",
  },
  {
    before: "Call notes live in someone's head or a legal pad",
    after: "AI summarizes every call straight onto the lead record",
  },
  {
    before: "Nobody knows the real close rate until month end",
    after: "Live scorecards and a TV wall the whole floor can see",
  },
  {
    before: "New reps take weeks to learn 'the system'",
    after: "One pipeline, one queue, one way of working — from day one",
  },
];

export function WhyVesperwise() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto flex max-w-6xl flex-col gap-14 px-4 sm:px-6">
        <SectionHeading
          eyebrow="Why VesperWise"
          title="Less chasing. More closing."
        />

        <Reveal>
          <div className="grid overflow-hidden rounded-xl ring-1 ring-foreground/10 lg:grid-cols-2">
            <div className="flex flex-col gap-5 surface-quiet p-6 sm:p-8">
              <h3 className="font-mono text-xs font-medium tracking-[0.2em] text-cold uppercase">
                Spreadsheets &amp; sticky notes
              </h3>
              <ul className="flex flex-col gap-4">
                {COMPARISON_ROWS.map((row) => (
                  <li
                    key={row.before}
                    className="flex items-start gap-3 text-sm text-muted-foreground"
                  >
                    <X className="mt-0.5 size-4 shrink-0 text-cold" />
                    {row.before}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-5 bg-card p-6 sm:p-8">
              <h3 className="font-mono text-xs font-medium tracking-[0.2em] text-accent-foreground uppercase">
                VesperWise
              </h3>
              <ul className="flex flex-col gap-4">
                {COMPARISON_ROWS.map((row) => (
                  <li
                    key={row.after}
                    className="flex items-start gap-3 text-sm"
                  >
                    <Check className="mt-0.5 size-4 shrink-0 text-hot" />
                    {row.after}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
