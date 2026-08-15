import {
  MARKETING_DAY_SEQUENCE,
  type MarketingSequenceState,
} from "@/components/marketing/mock/mock-data";
import { Stagger, StaggerItem } from "@/components/marketing/motion/stagger";

interface SequenceStateClasses {
  border: string;
  background: string;
  text: string;
  day: string;
  bar: string;
}

const SEQUENCE_STATE_CLASSES: Record<MarketingSequenceState, SequenceStateClasses> = {
  0: {
    border: "border-[color:var(--mkt-border-subtle)]",
    background: "bg-[var(--mkt-bg)]",
    text: "text-[var(--mkt-text3)]",
    day: "text-[var(--mkt-text3)]",
    bar: "bg-[var(--mkt-border-subtle)]",
  },
  1: {
    border: "border-[color:var(--mkt-accent)]",
    background: "bg-[var(--mkt-accent-soft)]",
    text: "text-[var(--mkt-text)]",
    day: "text-[var(--mkt-text2)]",
    bar: "bg-[var(--mkt-accent)]",
  },
  2: {
    border: "border-[color:var(--mkt-border-subtle)]",
    background: "bg-[var(--mkt-bg)]",
    text: "text-[var(--mkt-text)]",
    day: "text-[var(--mkt-text2)]",
    bar: "bg-[var(--mkt-border-strong)]",
  },
};

export function MockDaySequence() {
  return (
    <div className="min-w-0 overflow-x-auto">
      <Stagger className="grid min-w-[640px] grid-cols-7 gap-2 sm:min-w-0">
        {MARKETING_DAY_SEQUENCE.map((step, index) => {
          const state = SEQUENCE_STATE_CLASSES[step.state];

          return (
            <StaggerItem
              key={`${step.day}-${step.action}-${index}`}
              className={`flex min-h-[92px] flex-col gap-[9px] rounded-lg border p-2.5 pt-[11px] ${state.border} ${state.background}`}
            >
              <span className={`font-mono text-[10px] leading-none ${state.day}`}>
                {step.day}
              </span>
              <span className={`font-sans text-[11.5px] leading-[1.35] ${state.text}`}>
                {step.action}
              </span>
              <span className={`mt-auto block h-0.5 w-full rounded-sm ${state.bar}`} />
            </StaggerItem>
          );
        })}
      </Stagger>
    </div>
  );
}
