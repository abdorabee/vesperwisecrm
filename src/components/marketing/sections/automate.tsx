import { Stagger, StaggerItem } from "@/components/marketing/motion/stagger";
import { Reveal } from "@/components/marketing/motion/reveal";
import { cn } from "@/lib/utils";

export type MarketingWorkflowKind = "TRIGGER" | "ACTION" | "BRANCH";

export interface MarketingWorkflowStep {
  kind: MarketingWorkflowKind;
  title: string;
  detail: string;
  accent?: boolean;
}

export interface MarketingOtherWorkflow {
  tag: string;
  text: string;
}

export const MARKETING_WORKFLOW_STEPS: MarketingWorkflowStep[] = [
  {
    kind: "TRIGGER",
    title: "New lead created",
    detail: "Any source",
    accent: true,
  },
  {
    kind: "ACTION",
    title: "Skip trace + enrich",
    detail: "Phones, email, property data",
  },
  {
    kind: "ACTION",
    title: "Score motivation",
    detail: "AI, from form + call data",
    accent: true,
  },
  {
    kind: "BRANCH",
    title: "Score ≥ 70?",
    detail: "Yes → assign · No → nurture",
  },
  {
    kind: "ACTION",
    title: "Route to rep",
    detail: "Round robin by market",
  },
  {
    kind: "ACTION",
    title: "Queue power dial",
    detail: "First touch within 5 min",
    accent: true,
  },
];

export const MARKETING_OTHER_WORKFLOWS: MarketingOtherWorkflow[] = [
  {
    tag: "WORKFLOW 07",
    text: "No contact after 6 attempts → drop to long-term nurture, revisit in 90 days.",
  },
  {
    tag: "WORKFLOW 11",
    text: "Deal untouched for 4 days in Negotiation → notify manager, reassign.",
  },
  {
    tag: "WORKFLOW 14",
    text: "Contract signed → create closing checklist, notify title, log spread.",
  },
];

export function Automate() {
  return (
    <section id="ch5" className="mkt-divider bg-[var(--mkt-bg)] scroll-mt-24">
      <div className="mx-auto max-w-[1240px] px-7 py-24 sm:py-28">
        <Reveal className="max-w-[52ch]">
          <div className="flex items-baseline gap-3.5">
            <span className="font-mono text-[clamp(30px,3.4vw,44px)] leading-none tracking-[-0.03em] text-[var(--mkt-text3)]">
              5.0
            </span>
            <h2 className="font-sans text-[clamp(30px,3.4vw,44px)] font-normal leading-none tracking-[-0.032em] text-[var(--mkt-text)]">
              Automate
            </h2>
          </div>
          <p className="mt-5 text-[17px] font-light leading-[1.6] text-[var(--mkt-text2)]">
            Rules watch the record and act. A new lead is enriched, routed and
            dialled; a stalled deal is reassigned; a dead lead re-enters
            nurture ninety days later. No one has to remember.
          </p>
        </Reveal>

        <Reveal delay={0.08} className="mt-12 min-w-0">
          <div
            className="min-w-0 overflow-hidden rounded-[14px] border border-[color:var(--mkt-border)] bg-[var(--mkt-surface)] shadow-[0_18px_50px_color-mix(in_oklch,var(--mkt-text)_8%,transparent)]"
            aria-hidden
          >
            <div className="flex min-h-[42px] items-center gap-2.5 border-b border-[color:var(--mkt-border-subtle)] bg-[var(--mkt-raised)] px-4 py-2">
              <span className="font-mono text-[10.5px] font-medium tracking-[0.09em] text-[var(--mkt-text3)]">
                WORKFLOW 03 · NEW LEAD → FIRST TOUCH
              </span>
              <span className="ml-auto flex items-center gap-2 font-mono text-[11px] text-[var(--mkt-text2)]">
                <span className="mkt-pulse block size-[5px] rounded-full bg-[var(--mkt-accent)]" />
                LIVE · 1,284 RUNS / 30D
              </span>
            </div>

            <div className="min-w-0 overflow-x-auto px-6 py-8">
              <div className="relative min-w-[860px]">
                <svg
                  className="absolute top-1/2 right-8 left-8 h-px -translate-y-1/2"
                  aria-hidden
                  preserveAspectRatio="none"
                  viewBox="0 0 100 1"
                >
                  <line
                    x1="0"
                    y1="0.5"
                    x2="100"
                    y2="0.5"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                    vectorEffect="non-scaling-stroke"
                    className="marketing-dash stroke-[var(--mkt-border)]"
                  />
                </svg>

                <Stagger className="relative flex items-stretch gap-0">
                  {MARKETING_WORKFLOW_STEPS.map((step, index) => (
                    <StaggerItem
                      key={step.title}
                      className="flex min-w-0 flex-1 items-center"
                    >
                      <div
                        className={cn(
                          "relative z-10 min-h-[122px] flex-1 rounded-[10px] border p-3.5",
                          step.accent
                            ? "border-[color:var(--mkt-accent)] bg-[var(--mkt-accent-soft)]"
                            : "border-[color:var(--mkt-border)] bg-[var(--mkt-bg)]",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "block size-4 rounded border",
                              step.accent
                                ? "border-[color:var(--mkt-accent)] bg-[var(--mkt-accent)]"
                                : "border-[color:var(--mkt-border)] bg-transparent",
                            )}
                          />
                          <span className="font-mono text-[10px] tracking-[0.07em] text-[var(--mkt-text3)]">
                            {step.kind}
                          </span>
                        </div>
                        <div className="mt-3 text-[13px] font-medium leading-[1.35] text-[var(--mkt-text)]">
                          {step.title}
                        </div>
                        <div className="mt-1.5 text-[11.5px] leading-[1.4] text-[var(--mkt-text3)]">
                          {step.detail}
                        </div>
                      </div>

                      {index < MARKETING_WORKFLOW_STEPS.length - 1 ? (
                        <span className="relative z-10 block h-px w-[30px] flex-none bg-[var(--mkt-border)]">
                          <span className="absolute top-1/2 right-0 block size-[5px] -translate-y-1/2 rounded-full bg-[var(--mkt-border-strong)]" />
                        </span>
                      ) : null}
                    </StaggerItem>
                  ))}
                </Stagger>
              </div>
            </div>

            <Stagger className="grid gap-px border-t border-[color:var(--mkt-border-subtle)] bg-[var(--mkt-border-subtle)] md:grid-cols-3">
              {MARKETING_OTHER_WORKFLOWS.map((workflow) => (
                <StaggerItem
                  key={workflow.tag}
                  className="bg-[var(--mkt-surface)] px-[18px] py-4"
                >
                  <div className="font-mono text-[10px] tracking-[0.07em] text-[var(--mkt-text3)]">
                    {workflow.tag}
                  </div>
                  <div className="mt-2.5 text-[13.5px] leading-[1.45] text-[var(--mkt-text2)]">
                    {workflow.text}
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
