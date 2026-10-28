import { SampleDataLabel } from "@/components/marketing/sample-data-label";
import { Stagger, StaggerItem } from "@/components/marketing/motion/stagger";
import { cn } from "@/lib/utils";

export interface MarketingSourceRow {
  name: string;
  accent?: boolean;
}

export const MARKETING_SOURCE_ROWS: MarketingSourceRow[] = [
  { name: "PPC", accent: true },
  { name: "Imported list", accent: true },
  { name: "Probate" },
  { name: "Direct mail" },
  { name: "Referral" },
];

export function MockSourceTable() {
  return (
    <div className="min-w-0" aria-hidden>
      <PanelHeader caption="FIG 6.1 — SOURCES ON THE QUEUE" />

      <div className="px-5 py-6">
        <Stagger className="grid">
          {MARKETING_SOURCE_ROWS.map((row) => (
            <StaggerItem
              key={row.name}
              className="grid grid-cols-[132px_minmax(0,1fr)] items-center gap-4 border-b border-[color:var(--mkt-border-subtle)] px-0.5 py-3"
            >
              <span className="text-[12.5px] leading-none text-[var(--mkt-text2)]">
                {row.name}
              </span>
              <span className="block h-2 overflow-hidden rounded-sm bg-[var(--mkt-bg2)]">
                <span
                  className={cn(
                    "block h-full w-2/3",
                    row.accent
                      ? "bg-[var(--mkt-accent)]"
                      : "bg-[var(--mkt-border-strong)]",
                  )}
                />
              </span>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </div>
  );
}

function PanelHeader({ caption }: { caption: string }) {
  return (
    <div className="flex min-h-11 items-center gap-4 border-b border-[color:var(--mkt-border-subtle)] bg-[var(--mkt-raised)] px-[18px] py-2">
      <span className="min-w-0 font-mono text-[10.5px] font-medium tracking-[0.09em] text-[var(--mkt-text3)]">
        {caption}
      </span>
      <SampleDataLabel className="ml-auto" />
    </div>
  );
}
