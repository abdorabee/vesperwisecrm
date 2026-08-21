import { Reveal } from "@/components/marketing/motion/reveal";
import { Stagger, StaggerItem } from "@/components/marketing/motion/stagger";

interface ComparisonRow {
  before: string;
  after: string;
}

const COMPARISON_ROWS: ComparisonRow[] = [
  {
    before: "Leads in a shared spreadsheet",
    after: "One queue with clear stages and assignments",
  },
  {
    before: "Contact info scattered across tools",
    after: "All contact history on one record",
  },
  {
    before: "Manual email follow-up tracking",
    after: "Automated email sequences with tracking",
  },
  {
    before: "Pipeline buried in spreadsheet tabs",
    after: "Visual pipeline with drag-and-drop stages",
  },
  {
    before: "Follow-up depends on who remembers",
    after: "Sequences and workflows own the follow-up",
  },
];

export function Comparison() {
  return (
    <section className="mkt-divider bg-[var(--mkt-bg)] text-[var(--mkt-text)]">
      <div className="mx-auto max-w-[1240px] px-7 py-24 sm:py-28">
        <Reveal className="grid min-w-0 gap-14 lg:grid-cols-[minmax(280px,0.72fr)_minmax(0,1fr)] lg:items-start">
          <div className="min-w-0 max-w-[36ch]">
            <span className="font-mono text-[10.5px] leading-none font-medium tracking-[0.1em] text-[var(--mkt-text3)]">
              7.0 — WHAT IT REPLACES
            </span>
            <h2 className="mt-5 font-sans text-[clamp(30px,3.4vw,44px)] leading-[1.05] font-normal tracking-normal text-balance text-[var(--mkt-text)]">
              One system instead of six tabs.
            </h2>
            <p className="mt-5 font-sans text-[17px] leading-[1.6] font-light text-[var(--mkt-text2)]">
              Teams arrive at VesperWiseCRM from spreadsheets and generic CRMs
              where follow-up dies in the gaps. Pipeline, email sequences, and
              the lead queue live on one platform.
            </p>
          </div>

          <Stagger className="min-w-0 border-t border-[color:var(--mkt-border)]">
            {COMPARISON_ROWS.map((row) => (
              <StaggerItem
                key={row.before}
                className="grid gap-3 border-b border-[color:var(--mkt-border-subtle)] py-5 sm:grid-cols-[minmax(0,0.92fr)_minmax(0,1fr)] sm:items-center sm:gap-8"
              >
                <div className="flex items-start gap-3 font-sans text-[14.5px] leading-[1.5] font-light text-[var(--mkt-text3)]">
                  <span
                    className="mt-[0.72em] h-px w-3 shrink-0 bg-[var(--mkt-border-strong)]"
                    aria-hidden
                  />
                  <span>{row.before}</span>
                </div>
                <div className="flex items-start gap-3 font-sans text-[15px] leading-[1.5] font-medium text-[var(--mkt-text)]">
                  <span
                    className="mt-[0.54em] size-[5px] shrink-0 rounded-full bg-[var(--mkt-accent)]"
                    aria-hidden
                  />
                  <span>{row.after}</span>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </Reveal>
      </div>
    </section>
  );
}
