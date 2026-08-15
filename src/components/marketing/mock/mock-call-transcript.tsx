import {
  MARKETING_QUALIFY_SCORES,
  MARKETING_QUALIFY_TAGS,
  type MarketingScoreTone,
} from "@/components/marketing/mock/mock-data";
import { Stagger, StaggerItem } from "@/components/marketing/motion/stagger";
import { cn } from "@/lib/utils";

const SCORE_TONE_CLASS: Record<MarketingScoreTone, string> = {
  accent: "bg-[var(--mkt-accent)]",
  strong: "bg-[var(--mkt-border-strong)]",
};

const SCORE_VALUE_CLASS: Record<MarketingScoreTone, string> = {
  accent: "text-[var(--mkt-text)]",
  strong: "text-[var(--mkt-text2)]",
};

export function MockCallTranscript() {
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-[color:var(--mkt-border)] bg-[var(--mkt-surface)]">
      <div className="flex h-[42px] items-center gap-[9px] border-b border-[color:var(--mkt-border-subtle)] bg-[var(--mkt-raised)] px-4">
        <span className="mkt-pulse block size-[5px] rounded-full bg-[var(--mkt-accent)]" />
        <span className="font-mono text-[11.5px] leading-none text-[var(--mkt-text3)]">
          CALL 00:07:12 · TRANSCRIBED
        </span>
        <span className="ml-auto hidden font-mono text-[11px] leading-none text-[var(--mkt-text3)] sm:block">
          DANA R. → M. WHITFIELD
        </span>
      </div>

      <div className="p-5 px-[18px]">
        <div className="font-mono text-[10.5px] leading-none font-medium tracking-normal text-[var(--mkt-text3)]">
          AI SUMMARY
        </div>
        <p className="mt-3 font-sans text-[14.5px] leading-[1.6] text-[var(--mkt-text)]">
          Inherited the property in March. Carrying two mortgages and wants to
          sell before probate closes. Roof and HVAC need work; will not list
          with an agent. Open to a cash offer at or above{" "}
          <span className="rounded-[3px] bg-[var(--mkt-accent-soft)] px-1 py-px">
            $185k
          </span>
          , closing in 30 days.
        </p>

        <Stagger className="mt-5 grid overflow-hidden rounded-[9px] border border-[color:var(--mkt-border-subtle)] bg-[var(--mkt-border-subtle)] [gap:1px] sm:grid-cols-2 xl:grid-cols-4">
          {MARKETING_QUALIFY_SCORES.map((score) => (
            <StaggerItem
              key={score.label}
              className="bg-[var(--mkt-surface)] p-3 py-[13px]"
            >
              <div className="font-mono text-[10px] leading-none tracking-normal text-[var(--mkt-text3)]">
                {score.label}
              </div>
              <div
                className={cn(
                  "my-2 font-sans text-[19px] leading-none font-medium tracking-normal",
                  SCORE_VALUE_CLASS[score.tone],
                )}
              >
                {score.value}
              </div>
              <span className="block h-[3px] overflow-hidden rounded-sm bg-[var(--mkt-bg2)]">
                <span
                  className={cn("block h-full", SCORE_TONE_CLASS[score.tone])}
                  style={{ width: `${score.pct}%` }}
                />
              </span>
            </StaggerItem>
          ))}
        </Stagger>

        <Stagger className="mt-[18px] flex flex-wrap gap-[7px]">
          {MARKETING_QUALIFY_TAGS.map((tag) => (
            <StaggerItem
              key={tag}
              className="rounded-[5px] border border-[color:var(--mkt-border-subtle)] bg-[var(--mkt-bg)] px-2 py-1.5 font-mono text-[11px] leading-none text-[var(--mkt-text2)]"
            >
              {tag}
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </div>
  );
}
