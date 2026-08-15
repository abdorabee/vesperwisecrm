import {
  MARKETING_UP_NEXT,
  MARKETING_WAVEFORM_BARS,
} from "@/components/marketing/mock/mock-data";
import { MockDaySequence } from "@/components/marketing/mock/mock-day-sequence";
import { cn } from "@/lib/utils";

export function MockPowerDial() {
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-[color:var(--mkt-border)] bg-[var(--mkt-surface)]">
      <div className="grid min-w-0 border-b border-[color:var(--mkt-border-subtle)] lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="min-w-0 p-5 pb-[22px]">
          <div className="font-mono text-[10.5px] leading-none font-medium tracking-normal text-[var(--mkt-text3)]">
            POWER DIAL · SESSION 41
          </div>
          <div className="mt-4 flex items-center gap-3.5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--mkt-border)] bg-[var(--mkt-accent)]">
              <span className="block size-[11px] rounded-[2px] bg-[var(--mkt-accent-ink)]" />
            </span>
            <div className="min-w-0">
              <div className="truncate font-sans text-[15px] leading-tight font-medium text-[var(--mkt-text)]">
                Denise Okoro
              </div>
              <div className="mt-1.5 truncate font-mono text-[11.5px] leading-none text-[var(--mkt-text3)]">
                (260) 555-0147 · LOCAL PRESENCE
              </div>
            </div>
            <span className="ml-auto font-mono text-[11.5px] leading-none text-[var(--mkt-text2)]">
              00:02:38
            </span>
          </div>

          <div className="mt-[18px] flex h-[34px] items-center gap-0.5">
            {MARKETING_WAVEFORM_BARS.map((bar, index) => (
              <span
                key={`${bar.height}-${index}`}
                className={cn(
                  "block flex-1 self-center rounded-[1px]",
                  bar.active ? "bg-[var(--mkt-accent)]" : "bg-[var(--mkt-border)]",
                )}
                style={{ height: bar.height }}
              />
            ))}
          </div>
        </div>

        <aside className="min-w-0 border-t border-[color:var(--mkt-border-subtle)] bg-[var(--mkt-raised)] p-4 px-3.5 lg:border-t-0 lg:border-l">
          <div className="mb-3 font-mono text-[10.5px] leading-none font-medium tracking-normal text-[var(--mkt-text3)]">
            UP NEXT
          </div>
          <div className="grid gap-0">
            {MARKETING_UP_NEXT.map((item) => (
              <div key={item} className="flex items-center gap-2 py-[7px]">
                <span className="block size-1 shrink-0 rounded-full bg-[var(--mkt-border-strong)]" />
                <span className="min-w-0 truncate font-sans text-xs leading-snug text-[var(--mkt-text2)]">
                  {item}
                </span>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <div className="p-5 pb-[22px]">
        <div className="mb-4 font-mono text-[10.5px] leading-none font-medium tracking-normal text-[var(--mkt-text3)]">
          SEQUENCE · 7-DAY SELLER FOLLOW-UP
        </div>
        <MockDaySequence />
      </div>
    </div>
  );
}
