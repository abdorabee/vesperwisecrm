import { Stagger, StaggerItem } from "@/components/marketing/motion/stagger";
import { cn } from "@/lib/utils";

export interface MarketingSourceKpi {
  label: string;
  value: string;
  delta: string;
}

export interface MarketingSourceRow {
  name: string;
  pct: string;
  contracts: string;
  cpc: string;
  accent?: boolean;
}

export const MARKETING_SOURCE_KPIS: MarketingSourceKpi[] = [
  { label: "CONTRACTS", value: "34", delta: "+21% VS PRIOR 90D" },
  { label: "COST / CONTRACT", value: "$1,840", delta: "−14%" },
  { label: "AVG SPREAD", value: "$27.4k", delta: "+$2.1k" },
  { label: "LEAD → CONTRACT", value: "2.9%", delta: "+0.6 PTS" },
];

export const MARKETING_SOURCE_ROWS: MarketingSourceRow[] = [
  { name: "PPC", pct: "88%", contracts: "12", cpc: "$1,410", accent: true },
  { name: "Cold list", pct: "66%", contracts: "9", cpc: "$980", accent: true },
  { name: "Probate", pct: "48%", contracts: "6", cpc: "$2,240" },
  { name: "Direct mail", pct: "34%", contracts: "4", cpc: "$3,110" },
  { name: "Referral", pct: "22%", contracts: "3", cpc: "$310" },
];

export function MockSourceTable() {
  return (
    <div className="min-w-0" aria-hidden>
      <PanelHeader
        caption="FIG 6.1 — COST PER CONTRACT BY SOURCE"
        meta="LAST 90 DAYS · ALL MARKETS"
      />

      <div className="px-5 py-6">
        <Stagger className="mb-7 grid overflow-hidden rounded-[10px] border border-[color:var(--mkt-border-subtle)] bg-[var(--mkt-border-subtle)] sm:grid-cols-2 lg:grid-cols-4">
          {MARKETING_SOURCE_KPIS.map((kpi) => (
            <StaggerItem
              key={kpi.label}
              className="bg-[var(--mkt-surface)] px-4 py-4"
            >
              <div className="font-mono text-[10px] tracking-[0.07em] text-[var(--mkt-text3)]">
                {kpi.label}
              </div>
              <div className="my-3 text-[27px] font-normal leading-none tracking-[-0.03em] text-[var(--mkt-text)]">
                {kpi.value}
              </div>
              <div className="font-mono text-[11px] text-[var(--mkt-text2)]">
                {kpi.delta}
              </div>
            </StaggerItem>
          ))}
        </Stagger>

        <div className="grid">
          {MARKETING_SOURCE_ROWS.map((row) => (
            <div
              key={row.name}
              className="grid grid-cols-[100px_minmax(0,1fr)_52px] items-center gap-4 border-b border-[color:var(--mkt-border-subtle)] px-0.5 py-3 sm:grid-cols-[132px_minmax(0,1fr)_78px_84px]"
            >
              <span className="text-[12.5px] leading-none text-[var(--mkt-text2)]">
                {row.name}
              </span>
              <span className="block h-2 overflow-hidden rounded-sm bg-[var(--mkt-bg2)]">
                <span
                  className={cn(
                    "block h-full",
                    row.accent
                      ? "bg-[var(--mkt-accent)]"
                      : "bg-[var(--mkt-border-strong)]",
                  )}
                  style={{ width: row.pct }}
                />
              </span>
              <span className="text-right font-mono text-xs font-medium text-[var(--mkt-text)]">
                {row.contracts}
              </span>
              <span className="hidden text-right font-mono text-xs text-[var(--mkt-text2)] sm:block">
                {row.cpc}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface PanelHeaderProps {
  caption: string;
  meta: string;
}

function PanelHeader({ caption, meta }: PanelHeaderProps) {
  return (
    <div className="flex min-h-11 items-center gap-4 border-b border-[color:var(--mkt-border-subtle)] bg-[var(--mkt-raised)] px-[18px] py-2">
      <span className="min-w-0 font-mono text-[10.5px] font-medium tracking-[0.09em] text-[var(--mkt-text3)]">
        {caption}
      </span>
      <span className="ml-auto hidden font-mono text-[10.5px] text-[var(--mkt-text3)] sm:block">
        {meta}
      </span>
    </div>
  );
}
