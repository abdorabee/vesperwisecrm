import {
  MARKETING_HERO_ACTIVITY,
  MARKETING_LEAD_INTEL_STATS,
} from "@/components/marketing/mock/mock-data";
import { cn } from "@/lib/utils";

const SELECTED_LEAD = {
  name: "Marcus Whitfield",
  address: "4127 Kessler Blvd · Indianapolis, IN",
  score: 92,
};

export function MockLeadIntelPanel() {
  return (
    <aside className="min-w-0 bg-[var(--mkt-raised)]">
      <div className="border-b border-[color:var(--mkt-border-subtle)] px-4 py-4 sm:px-[18px]">
        <div className="font-mono text-[10.5px] font-medium tracking-[0.09em] text-[var(--mkt-text3)] uppercase">
          Lead Intelligence
        </div>
        <div className="mt-2.5 font-sans text-[15px] leading-snug font-medium text-[var(--mkt-text)]">
          {SELECTED_LEAD.name}
        </div>
        <div className="mt-1 font-sans text-xs leading-snug text-[var(--mkt-text3)]">
          {SELECTED_LEAD.address}
        </div>
      </div>

      <div className="grid gap-3 border-b border-[color:var(--mkt-border-subtle)] px-4 py-4 sm:px-[18px]">
        <div className="flex items-center justify-between gap-3">
          <span className="font-sans text-xs text-[var(--mkt-text2)]">
            Motivation score
          </span>
          <span className="font-mono text-xs font-medium text-[var(--mkt-text)] tabular-nums">
            {SELECTED_LEAD.score}
          </span>
        </div>
        <div className="h-1 overflow-hidden rounded-sm bg-[var(--mkt-bg2)]">
          <span
            className="block h-full rounded-sm bg-[var(--mkt-accent)]"
            style={{ width: `${SELECTED_LEAD.score}%` }}
          />
        </div>

        <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-3">
          {MARKETING_LEAD_INTEL_STATS.map((stat) => (
            <div key={stat.label}>
              <div className="font-mono text-[10.5px] leading-none tracking-[0.06em] text-[var(--mkt-text3)]">
                {stat.label}
              </div>
              <div className="mt-1.5 font-sans text-[13px] leading-snug font-medium text-[var(--mkt-text)]">
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 sm:px-[18px]">
        <div className="mb-3 font-mono text-[10.5px] font-medium tracking-[0.09em] text-[var(--mkt-text3)] uppercase">
          Activity
        </div>
        <div className="grid">
          {MARKETING_HERO_ACTIVITY.map((event, index) => (
            <div
              key={`${event.time}-${event.text}`}
              className="grid grid-cols-[11px_minmax(0,1fr)] gap-3"
            >
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "mt-1 size-[7px] shrink-0 rounded-full border border-[color:var(--mkt-border)]",
                    event.accent ? "bg-[var(--mkt-accent)]" : "bg-[var(--mkt-border-strong)]",
                  )}
                />
                {index < MARKETING_HERO_ACTIVITY.length - 1 ? (
                  <span className="block min-h-4 w-px flex-1 bg-[var(--mkt-border-subtle)]" />
                ) : null}
              </div>
              <div className="min-w-0 pb-3.5">
                <div className="font-sans text-[12.5px] leading-snug text-[var(--mkt-text)]">
                  {event.text}
                </div>
                <div className="mt-1.5 font-mono text-[10.5px] leading-none text-[var(--mkt-text3)]">
                  {event.time}
                </div>
              </div>
            </div>
          ))}
        </div>
        <button
          tabIndex={-1}
          className="mt-1 w-full rounded-md border-0 bg-[var(--mkt-text)] px-3 py-3 font-sans text-[12.5px] leading-none font-medium text-[var(--mkt-bg)] transition-opacity duration-150 hover:opacity-85"
        >
          Start power dial
        </button>
      </div>
    </aside>
  );
}
