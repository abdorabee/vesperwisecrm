import { Check } from "lucide-react";
import type { ReactNode } from "react";

import { MockBrowserFrame } from "@/components/marketing/mock/mock-browser-frame";
import { MockLeadQueue } from "@/components/marketing/mock/mock-lead-queue";
import { MockPipeline } from "@/components/marketing/mock/mock-pipeline";
import { MockSequence } from "@/components/marketing/mock/mock-sequence";
import { Reveal } from "@/components/marketing/motion/reveal";
import { SectionHeading } from "@/components/marketing/section-heading";
import { cn } from "@/lib/utils";

interface ShowcaseBlock {
  eyebrow: string;
  title: string;
  problem: string;
  solution: string;
  bullets: string[];
  mock: ReactNode;
  url: string;
}

const SHOWCASE_BLOCKS: ShowcaseBlock[] = [
  {
    eyebrow: "Lead queue",
    title: "Stop losing deals in the queue.",
    problem:
      "Leads pour in from forms, lists, and cold calls — and the good ones get buried under the rest.",
    solution:
      "Every new lead lands in one queue, scored by AI, so your team always knows which call to make next.",
    bullets: [
      "Intake from forms, API, and list imports",
      "AI scores every lead the moment it arrives",
      "Hot leads surface to the top automatically",
    ],
    mock: <MockLeadQueue />,
    url: "app.vesperwise.com/queue",
  },
  {
    eyebrow: "Pipeline",
    title: "Your pipeline, not a spreadsheet.",
    problem:
      "Deals tracked in spreadsheets go stale, and nobody trusts the numbers by Friday.",
    solution:
      "Drag deals through stages on a live kanban board — values, owners, and match scores always in view.",
    bullets: [
      "Drag-and-drop stages the whole team shares",
      "Deal value and AI match score on every card",
      "Close rate and stage totals update live",
    ],
    mock: <MockPipeline />,
    url: "app.vesperwise.com/pipeline",
  },
  {
    eyebrow: "Sequences",
    title: "Follow-up that runs itself.",
    problem:
      "Most deals die from silence — the third, fourth, and fifth touches nobody has time to send.",
    solution:
      "Email and SMS sequences fire on schedule, pause on replies, and log every touch back to the lead.",
    bullets: [
      "Email + SMS steps with smart timing",
      "Auto-pause the moment a lead replies",
      "Every touch logged to the lead history",
    ],
    mock: <MockSequence />,
    url: "app.vesperwise.com/sequences",
  },
];

export function ProductShowcase() {
  return (
    <section id="product" className="scroll-mt-24 py-24 sm:py-32">
      <div className="mx-auto flex max-w-6xl flex-col gap-20 px-4 sm:px-6">
        <SectionHeading
          eyebrow="The product"
          title="From first touch to closed deal, in one system."
          subcopy="Every screen below is the real product — the same pipeline your team will live in every day."
        />

        {SHOWCASE_BLOCKS.map((block, index) => (
          <Reveal key={block.title}>
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <div
                className={cn(
                  "flex flex-col gap-4",
                  index % 2 === 1 && "lg:order-2",
                )}
              >
                <p className="font-mono text-xs font-medium tracking-[0.2em] text-accent-foreground uppercase">
                  {block.eyebrow}
                </p>
                <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  {block.title}
                </h3>
                <p className="text-muted-foreground">{block.problem}</p>
                <p className="text-foreground/90">{block.solution}</p>
                <ul className="mt-2 flex flex-col gap-2.5">
                  {block.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-center gap-2.5 text-sm">
                      <Check className="size-4 shrink-0 text-hot" />
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
              <MockBrowserFrame
                url={block.url}
                className={cn(index % 2 === 1 && "lg:order-1")}
              >
                {block.mock}
              </MockBrowserFrame>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
