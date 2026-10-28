import { SampleDataLabel } from "@/components/marketing/sample-data-label";
import { cn } from "@/lib/utils";

export interface MarketingRepRow {
  name: string;
}

export const MARKETING_REP_ROWS: MarketingRepRow[] = [
  { name: "Dana Reyes" },
  { name: "Marcus Ju" },
  { name: "Aisha Karim" },
  { name: "Owen Brandt" },
  { name: "Nina Sokolov" },
];

export function MockRepLeaderboard() {
  return (
    <div className="min-w-0" aria-hidden>
      <PanelHeader caption="FIG 6.3 — SAMPLE OWNERS" />

      <div className="pt-1.5">
        <div className="grid h-[34px] grid-cols-[minmax(0,1fr)_auto] items-center border-b border-[color:var(--mkt-border-subtle)] bg-[var(--mkt-bg2)] px-5">
          <span className="font-mono text-[10.5px] font-medium tracking-[0.07em] text-[var(--mkt-text3)]">
            OWNER
          </span>
          <span className="font-mono text-[10.5px] font-medium tracking-[0.07em] text-[var(--mkt-text3)]">
            ROLE
          </span>
        </div>

        {MARKETING_REP_ROWS.map((row) => (
          <div
            key={row.name}
            className={cn(
              "grid h-[50px] grid-cols-[minmax(0,1fr)_auto] items-center border-b border-[color:var(--mkt-border-subtle)] px-5 transition-colors hover:bg-[var(--mkt-bg2)]",
            )}
          >
            <span className="truncate text-[13px] font-medium leading-none text-[var(--mkt-text)]">
              {row.name}
            </span>
            <span className="font-mono text-[12.5px] text-[var(--mkt-text2)]">
              Owner
            </span>
          </div>
        ))}
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
