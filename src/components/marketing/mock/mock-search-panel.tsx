import {
  MARKETING_FUNNEL_BARS,
  MARKETING_INTAKE_FILTERS,
  type MarketingBarTone,
} from "@/components/marketing/mock/mock-data";
import { Stagger, StaggerItem } from "@/components/marketing/motion/stagger";
import { cn } from "@/lib/utils";

const BAR_TONE_CLASS: Record<MarketingBarTone, string> = {
  accent: "bg-[var(--mkt-accent)]",
  strong: "bg-[var(--mkt-border-strong)]",
  bg2: "bg-[var(--mkt-bg2)]",
};

export function MockSearchPanel() {
  return (
    <div className="min-w-0">
      <div className="mb-3 flex items-end justify-between gap-4">
        <span className="min-w-0 font-mono text-[10.5px] leading-snug font-medium tracking-normal text-[var(--mkt-text3)]">
          FIG 1.1 — SEARCH SPACE CONSTRAINED BY FILTERS
        </span>
        <span className="shrink-0 font-mono text-[10.5px] leading-none text-[var(--mkt-text3)]">
          18,402 → 214
        </span>
      </div>

      <div className="grid min-w-0 overflow-hidden rounded-2xl border border-[color:var(--mkt-border)] bg-[var(--mkt-surface)] lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="min-w-0 border-b border-[color:var(--mkt-border-subtle)] bg-[var(--mkt-raised)] p-[18px] pb-[22px] lg:border-r lg:border-b-0">
          <div className="mb-[15px] font-mono text-[10.5px] leading-none font-medium tracking-normal text-[var(--mkt-text3)]">
            FILTERS · ICP
          </div>

          <Stagger className="grid gap-[9px]">
            {MARKETING_INTAKE_FILTERS.map((filter) => (
              <StaggerItem
                key={filter.label}
                className={cn(
                  "flex cursor-default items-center gap-[9px] font-sans text-[12.5px] leading-none",
                  filter.on ? "text-[var(--mkt-text)]" : "text-[var(--mkt-text3)]",
                )}
              >
                <span
                  className={cn(
                    "flex size-3.5 shrink-0 items-center justify-center rounded border",
                    filter.on
                      ? "border-[color:var(--mkt-accent)] bg-[var(--mkt-accent)]"
                      : "border-[color:var(--mkt-border)] bg-transparent",
                  )}
                  aria-hidden
                >
                  <span
                    className={cn(
                      "block size-[5px] rounded-[1px]",
                      filter.on ? "bg-[var(--mkt-accent-ink)]" : "bg-transparent",
                    )}
                  />
                </span>
                {filter.label}
              </StaggerItem>
            ))}
          </Stagger>

          <div className="mt-5 border-t border-[color:var(--mkt-border-subtle)] pt-4">
            <div className="font-mono text-[10.5px] leading-none tracking-normal text-[var(--mkt-text3)]">
              EQUITY RANGE
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="font-mono text-[11.5px] leading-none font-medium text-[var(--mkt-text)]">
                40%
              </span>
              <span className="relative block h-[3px] flex-1 rounded-sm bg-[var(--mkt-bg2)]">
                <span className="absolute inset-y-0 left-[22%] right-[8%] block rounded-sm bg-[var(--mkt-accent)]" />
              </span>
              <span className="font-mono text-[11.5px] leading-none font-medium text-[var(--mkt-text)]">
                95%
              </span>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="flex min-h-[46px] flex-col gap-2 border-b border-[color:var(--mkt-border-subtle)] p-4 sm:flex-row sm:items-center sm:gap-2.5 sm:px-4 sm:py-0">
            <div className="flex min-w-0 flex-1 items-center gap-[9px] rounded-[7px] border border-[color:var(--mkt-border)] bg-[var(--mkt-bg)] px-[11px] py-2">
              <span className="block size-2.5 shrink-0 rounded-full border-[1.5px] border-[color:var(--mkt-text3)]" />
              <span className="min-w-0 truncate font-sans text-[12.5px] leading-none text-[var(--mkt-text2)]">
                absentee owner, 5+ yr tenure, Marion County
              </span>
              <span className="ml-auto font-mono text-[10.5px] leading-none text-[var(--mkt-text3)]">
                ⌘K
              </span>
            </div>
            <span className="inline-flex shrink-0 items-center justify-center rounded-md bg-[var(--mkt-accent)] px-3 py-[9px] font-sans text-[11.5px] leading-none font-medium text-[var(--mkt-accent-ink)]">
              Push 214 to queue
            </span>
          </div>

          <div className="p-5 px-[18px] pb-[22px]">
            <div className="flex h-[132px] items-end gap-[3px]">
              {MARKETING_FUNNEL_BARS.map((bar, index) => (
                <span
                  key={`${bar.height}-${index}`}
                  className={cn(
                    "mkt-grow block min-w-[3px] flex-1 rounded-t-sm",
                    BAR_TONE_CLASS[bar.tone],
                  )}
                  style={{
                    height: bar.height,
                    animationDelay: `${bar.delaySeconds}s`,
                  }}
                />
              ))}
            </div>

            <div className="mt-3 flex flex-col gap-2 border-t border-[color:var(--mkt-border-subtle)] pt-[11px] sm:flex-row sm:justify-between">
              <span className="font-mono text-[10.5px] leading-none text-[var(--mkt-text3)]">
                TOTAL LIST 18,402
              </span>
              <span className="font-mono text-[10.5px] leading-none text-[var(--mkt-text3)]">
                MATCHED 214 · SKIP TRACED 214 · DUPES REMOVED 63
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
