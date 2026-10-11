import { MARKETING_UP_NEXT } from "@/components/marketing/mock/mock-data";
import { MockDaySequence } from "@/components/marketing/mock/mock-day-sequence";

export function MockPowerDial() {
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-[color:var(--mkt-border)] bg-[var(--mkt-surface)]">
      <div className="grid min-w-0 border-b border-[color:var(--mkt-border-subtle)] lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="min-w-0 p-5 pb-[22px]">
          <div className="font-mono text-[10.5px] leading-none font-medium tracking-normal text-[var(--mkt-text3)]">
            EMAIL SEQUENCE · EARLY
          </div>
          <div className="mt-4">
            <div className="truncate font-sans text-[15px] leading-tight font-medium text-[var(--mkt-text)]">
              Intro and process outline
            </div>
            <div className="mt-1.5 font-mono text-[11.5px] leading-none text-[var(--mkt-text3)]">
              DAY 2 · SCHEDULED · NOT SENT YET
            </div>
          </div>
          <p className="mt-[18px] max-w-[46ch] font-sans text-[13px] leading-[1.5] text-[var(--mkt-text2)]">
            Email sequences (early) sit on the same lead as the owner and the
            stage. A real send has not gone out in production.
          </p>
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
          SEQUENCE · EMAIL FOLLOW-UP (EARLY)
        </div>
        <MockDaySequence />
      </div>
    </div>
  );
}
