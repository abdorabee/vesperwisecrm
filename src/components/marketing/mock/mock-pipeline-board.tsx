import { Stagger, StaggerItem } from "@/components/marketing/motion/stagger";
import { cn } from "@/lib/utils";

type PipelineDotTone = "accent" | "border" | "strong";

export interface MarketingPipelineCard {
  addr: string;
  spread: string;
  age: string;
  rep: string;
  meta: string;
  hot?: boolean;
  motivation: number;
  nextTitle: string;
  nextDue: string;
  overdue?: boolean;
}

export interface MarketingPipelineColumn {
  name: string;
  count: string;
  value: string;
  dot: PipelineDotTone;
  cards: MarketingPipelineCard[];
}

export interface MarketingPipelineFooterItem {
  label: string;
  value: string;
}

export const MARKETING_PIPELINE_COLUMNS: MarketingPipelineColumn[] = [
  {
    name: "OFFER OUT",
    count: "9",
    value: "$1.62M",
    dot: "strong",
    cards: [
      {
        addr: "4127 Kessler Blvd",
        spread: "$29k",
        age: "2d",
        rep: "DR",
        meta: "OFFER SENT",
        motivation: 92,
        nextTitle: "Call the seller",
        nextDue: "Due in 2 days",
      },
      {
        addr: "882 Ridgeline Ct",
        spread: "$18k",
        age: "5d",
        rep: "MJ",
        meta: "AWAITING REPLY",
        motivation: 78,
        nextTitle: "No next action",
        nextDue: "",
      },
    ],
  },
  {
    name: "NEGOTIATION",
    count: "6",
    value: "$1.05M",
    dot: "strong",
    cards: [
      {
        addr: "15 Halstead Ave",
        spread: "$41k",
        age: "3d",
        rep: "DR",
        meta: "COUNTERED",
        hot: true,
        motivation: 84,
        nextTitle: "Send the offer",
        nextDue: "Overdue · 3 days ago",
        overdue: true,
      },
      {
        addr: "77 Ellsworth Rd",
        spread: "$22k",
        age: "8d",
        rep: "AK",
        meta: "SECOND CALL",
        motivation: 61,
        nextTitle: "Sequence: Intro email",
        nextDue: "Due tomorrow",
      },
    ],
  },
  {
    name: "UNDER CONTRACT",
    count: "4",
    value: "$742K",
    dot: "accent",
    cards: [
      {
        addr: "231 W Morris St",
        spread: "$36k",
        age: "1d",
        rep: "MJ",
        meta: "SIGNED",
        hot: true,
        motivation: 88,
        nextTitle: "Book the inspection",
        nextDue: "Due in 5 days",
      },
      {
        addr: "9040 Sunfield Dr",
        spread: "$14k",
        age: "6d",
        rep: "AK",
        meta: "INSPECTION",
        motivation: 54,
        nextTitle: "No next action",
        nextDue: "",
      },
    ],
  },
  {
    name: "CLOSING",
    count: "3",
    value: "$518K",
    dot: "accent",
    cards: [
      {
        addr: "3312 Brookville Rd",
        spread: "$27k",
        age: "4d",
        rep: "DR",
        meta: "TITLE CLEAR",
        hot: true,
        motivation: 71,
        nextTitle: "Confirm title",
        nextDue: "Due in 4 days",
      },
    ],
  },
  {
    name: "CLOSED",
    count: "11",
    value: "$1.94M",
    dot: "border",
    cards: [
      {
        addr: "620 Linden Way",
        spread: "$33k",
        age: "—",
        rep: "MJ",
        meta: "FUNDED",
        motivation: 90,
        nextTitle: "No next action",
        nextDue: "",
      },
      {
        addr: "18 Carrow St",
        spread: "$21k",
        age: "—",
        rep: "AK",
        meta: "FUNDED",
        motivation: 66,
        nextTitle: "No next action",
        nextDue: "",
      },
    ],
  },
];

export const MARKETING_PIPELINE_FOOTER: MarketingPipelineFooterItem[] = [
  { label: "OPEN PIPELINE", value: "$3.93M" },
  { label: "WEIGHTED", value: "$1.71M" },
  { label: "AVG SPREAD", value: "$27.4K" },
  { label: "AVG DAYS TO CONTRACT", value: "11" },
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
                  <span className="ml-auto font-mono text-[11px] text-[var(--mkt-text3)]">
                    {column.count}
                  </span>
                </div>
                <div className="mt-2.5 text-sm font-medium tracking-[-0.01em] text-[var(--mkt-text)]">
                  {column.value}
                </div>
              </div>

              <div className="grid min-h-[268px] content-start gap-2 p-3">
                {column.cards.map((card) => (
                  <div
                    key={card.addr}
                    className={cn(
                      "rounded-[9px] border p-2.5 transition-transform duration-200 hover:-translate-y-px hover:border-[color:var(--mkt-border-strong)]",
                      card.hot
                        ? "border-[color:var(--mkt-accent)] bg-[var(--mkt-accent-soft)]"
                        : "border-[color:var(--mkt-border-subtle)] bg-[var(--mkt-bg)]",
                    )}
                  >
                    <div className="truncate text-[12.5px] font-medium leading-[1.3] text-[var(--mkt-text)]">
                      {card.addr}
                    </div>
                    <div className="mt-2 font-mono text-[10px] tracking-[0.04em] text-[var(--mkt-text3)]">
                      Motivation score {card.motivation}
                    </div>
                    {card.nextTitle === "No next action" ? (
                      <span className="mt-2 inline-flex w-fit rounded border border-[color:var(--mkt-border)] px-1.5 py-1 font-mono text-[10px] leading-none text-[var(--mkt-text2)]">
                        No next action
                      </span>
                    ) : (
                      <div className="mt-2">
                        <div className="text-[12px] font-medium leading-[1.3] text-[var(--mkt-text)]">
                          {card.nextTitle}
                        </div>
                        <div
                          className={cn(
                            "mt-1 font-mono text-[10.5px]",
                            card.overdue
                              ? "font-medium text-[var(--mkt-accent)]"
                              : "text-[var(--mkt-text3)]",
                          )}
                        >
                          {card.nextDue}
                        </div>
                      </div>
                    )}
                    <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-[color:var(--mkt-border-subtle)] pt-2">
                      <span
                        className={cn(
                          "font-mono text-[11.5px] font-medium text-[var(--mkt-text2)]",
                          card.hot && "text-[var(--mkt-text)]",
                        )}
                      >
                        {card.spread}
                      </span>
                      <span className="font-mono text-[10.5px] text-[var(--mkt-text3)]">
                        {card.rep}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-[color:var(--mkt-border-subtle)] bg-[var(--mkt-raised)] px-4 py-3.5">
        {MARKETING_PIPELINE_FOOTER.map((item) => (
          <span
            key={item.label}
            className="font-mono text-[10.5px] tracking-[0.06em] text-[var(--mkt-text3)]"
          >
            {item.label}{" "}
            <span className="text-[var(--mkt-text)]">{item.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
