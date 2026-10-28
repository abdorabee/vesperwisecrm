import { SampleDataLabel } from "@/components/marketing/sample-data-label";
import { Stagger, StaggerItem } from "@/components/marketing/motion/stagger";
import { cn } from "@/lib/utils";

export interface MarketingFunnelRow {
  label: string;
  height: string;
  accent?: boolean;
}

export const MARKETING_FUNNEL_ROWS: MarketingFunnelRow[] = [
  { label: "LEADS", height: "100%" },
  { label: "CONTACTED", height: "80%" },
  { label: "QUALIFIED", height: "62%" },
  { label: "APPOINTMENT", height: "46%" },
  { label: "OFFER", height: "32%", accent: true },
  { label: "CONTRACT", height: "22%", accent: true },
];

export function MockFunnelChart() {
  return (
    <div className="min-w-0" aria-hidden>
      <PanelHeader caption="FIG 6.2 — SAMPLE STAGES" />

      <div className="px-5 py-8">
        <div className="min-w-0 overflow-x-auto">
          <Stagger className="flex h-[210px] min-w-[560px] items-end gap-3.5">
            {MARKETING_FUNNEL_ROWS.map((row) => (
              <StaggerItem
                key={row.label}
                className="flex h-full min-w-0 flex-1 flex-col justify-end gap-3"
              >
                <span
                  className={cn(
                    "block w-full rounded-t-[3px]",
                    row.accent
                      ? "bg-[var(--mkt-accent)]"
                      : "bg-[var(--mkt-border-strong)]",
                  )}
                  style={{ height: row.height }}
                />
                <span className="border-t border-[color:var(--mkt-border-subtle)] pt-2.5 font-mono text-[10.5px] leading-[1.3] tracking-[0.06em] text-[var(--mkt-text3)]">
                  {row.label}
                </span>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
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
