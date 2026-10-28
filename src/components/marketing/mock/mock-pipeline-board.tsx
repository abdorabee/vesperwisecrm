import { SampleDataLabel } from "@/components/marketing/sample-data-label";
import { Stagger, StaggerItem } from "@/components/marketing/motion/stagger";
import { cn } from "@/lib/utils";

type PipelineDotTone = "accent" | "border" | "strong";

export interface MarketingPipelineCard {
  addr: string;
  rep: string;
  meta: string;
}

export interface MarketingPipelineColumn {
  name: string;
  dot: PipelineDotTone;
  cards: MarketingPipelineCard[];
}

export const MARKETING_PIPELINE_COLUMNS: MarketingPipelineColumn[] = [
  {
    name: "OFFER OUT",
    dot: "strong",
    cards: [
      { addr: "4127 Kessler Blvd", rep: "DR", meta: "OFFER SENT" },
      { addr: "882 Ridgeline Ct", rep: "MJ", meta: "AWAITING REPLY" },
    ],
  },
  {
    name: "NEGOTIATION",
    dot: "strong",
    cards: [
      { addr: "15 Halstead Ave", rep: "DR", meta: "COUNTERED" },
      { addr: "77 Ellsworth Rd", rep: "AK", meta: "NEXT TASK" },
    ],
  },
  {
    name: "UNDER CONTRACT",
    dot: "accent",
    cards: [
      { addr: "231 W Morris St", rep: "MJ", meta: "SIGNED" },
      { addr: "9040 Sunfield Dr", rep: "AK", meta: "INSPECTION" },
    ],
  },
  {
    name: "CLOSING",
    dot: "accent",
    cards: [{ addr: "3312 Brookville Rd", rep: "DR", meta: "TITLE CLEAR" }],
  },
  {
    name: "CLOSED",
    dot: "border",
    cards: [
      { addr: "620 Linden Way", rep: "MJ", meta: "FUNDED" },
      { addr: "18 Carrow St", rep: "AK", meta: "FUNDED" },
    ],
  },
];

function getDotClassName(dot: PipelineDotTone): string {
  if (dot === "accent") {
    return "bg-[var(--mkt-accent)]";
  }

  if (dot === "strong") {
    return "bg-[var(--mkt-border-strong)]";
  }

  return "bg-[var(--mkt-border)]";
}

export function MockPipelineBoard() {
  return (
    <div
      className="min-w-0 overflow-hidden rounded-[14px] border border-[color:var(--mkt-border)] bg-[var(--mkt-surface)] shadow-[0_18px_50px_color-mix(in_oklch,var(--mkt-text)_8%,transparent)]"
      aria-hidden
    >
      <div className="flex min-h-11 items-center justify-between gap-3 border-b border-[color:var(--mkt-border-subtle)] bg-[var(--mkt-raised)] px-4 py-2">
        <span className="font-mono text-[10.5px] font-medium tracking-[0.09em] text-[var(--mkt-text3)]">
          STAGES
        </span>
        <SampleDataLabel />
      </div>
      <div className="min-w-0 overflow-x-auto">
        <Stagger className="grid min-w-[940px] grid-cols-5 gap-px bg-[var(--mkt-border-subtle)]">
          {MARKETING_PIPELINE_COLUMNS.map((column) => (
            <StaggerItem
              key={column.name}
              className="flex min-w-0 flex-col bg-[var(--mkt-surface)]"
            >
              <div className="border-b border-[color:var(--mkt-border-subtle)] bg-[var(--mkt-raised)] px-3.5 py-3.5">
                <div className="flex items-center gap-2">
                  <span
                    className={cn("block size-[5px] rounded-full", getDotClassName(column.dot))}
                  />
                  <span className="font-mono text-[11px] font-medium tracking-[0.07em] text-[var(--mkt-text2)]">
                    {column.name}
                  </span>
                </div>
              </div>

              <div className="grid min-h-[268px] content-start gap-2 p-3">
                {column.cards.map((card) => (
                  <div
                    key={card.addr}
                    className="rounded-[9px] border border-[color:var(--mkt-border-subtle)] bg-[var(--mkt-bg)] p-2.5 transition-transform duration-200 hover:-translate-y-px hover:border-[color:var(--mkt-border-strong)]"
                  >
                    <div className="truncate text-[12.5px] font-medium leading-[1.3] text-[var(--mkt-text)]">
                      {card.addr}
                    </div>
                    <div className="mt-2.5 flex items-center gap-1.5 border-t border-[color:var(--mkt-border-subtle)] pt-2">
                      <span className="block size-[15px] rounded-full border border-[color:var(--mkt-border-subtle)] bg-[var(--mkt-bg2)] text-center font-mono text-[8px] font-medium leading-[13px] text-[var(--mkt-text2)]">
                        {card.rep}
                      </span>
                      <span className="font-mono text-[10.5px] text-[var(--mkt-text3)]">
                        {card.meta}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </div>
  );
}
