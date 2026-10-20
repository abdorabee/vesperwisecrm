import { MARKETING_ENGAGE_STATS } from "@/components/marketing/mock/mock-data";
import { Reveal } from "@/components/marketing/motion/reveal";
import { Stagger, StaggerItem } from "@/components/marketing/motion/stagger";

const RECORD_LINES = [
  { label: "Owner", value: "Dana R." },
  { label: "Note", value: "Wants a timeline before listing." },
  { label: "Task", value: "Callback Thursday" },
  { label: "Stage", value: "Qualified" },
];

export function Engage() {
  return (
    <section id="ch3" className="mkt-divider scroll-mt-24 bg-[var(--mkt-bg)]">
      <div className="mx-auto max-w-[1240px] px-7 py-24 sm:py-28">
        <Reveal className="grid min-w-0 items-start gap-14 lg:grid-cols-[minmax(280px,0.72fr)_minmax(0,1.28fr)]">
          <div className="min-w-0 lg:sticky lg:top-24">
            <div className="flex items-baseline gap-3.5">
              <span className="font-mono text-[clamp(30px,3.4vw,44px)] leading-none font-normal tracking-normal text-[var(--mkt-text3)]">
                3.0
              </span>
              <h2 className="font-sans text-[clamp(30px,3.4vw,44px)] leading-none font-normal tracking-normal text-[var(--mkt-text)]">
                Record
              </h2>
            </div>
            <p className="mt-5 max-w-[38ch] font-sans text-[17px] leading-[1.6] font-light text-[var(--mkt-text2)]">
              Notes, tasks, and owner sit on the lead. The next action is never a guess.
            </p>

            <Stagger className="mt-8 grid border-t border-[color:var(--mkt-border)]">
              {MARKETING_ENGAGE_STATS.map((stat) => (
                <StaggerItem
                  key={stat.label}
                  className="flex items-baseline justify-between gap-3 border-b border-[color:var(--mkt-border-subtle)] py-3.5"
                >
                  <span className="font-sans text-[13.5px] leading-snug text-[var(--mkt-text2)]">
                    {stat.label}
                  </span>
                  <span className="font-mono text-[13.5px] leading-none font-medium text-[var(--mkt-text)]">
                    {stat.value}
                  </span>
                </StaggerItem>
              ))}
            </Stagger>
          </div>

          <div className="min-w-0">
            <div className="mb-3 flex items-end justify-between">
              <span className="font-mono text-[10.5px] leading-none font-medium tracking-normal text-[var(--mkt-text3)]">
                FIG 3.1 — LEAD RECORD
              </span>
            </div>
            <div className="min-w-0 overflow-hidden rounded-2xl border border-[color:var(--mkt-border)] bg-[var(--mkt-surface)]">
              <div className="border-b border-[color:var(--mkt-border-subtle)] px-5 py-4">
                <div className="font-sans text-[15px] font-medium text-[var(--mkt-text)]">
                  Marcus Whitfield
                </div>
                <div className="mt-1 font-sans text-xs text-[var(--mkt-text3)]">
                  4127 Kessler Blvd · Indianapolis, IN
                </div>
              </div>
              <dl className="grid">
                {RECORD_LINES.map((line) => (
                  <div
                    key={line.label}
                    className="flex items-baseline justify-between gap-4 border-b border-[color:var(--mkt-border-subtle)] px-5 py-3.5 last:border-b-0"
                  >
                    <dt className="font-mono text-[10.5px] tracking-[0.06em] text-[var(--mkt-text3)] uppercase">
                      {line.label}
                    </dt>
                    <dd className="text-right font-sans text-[13.5px] text-[var(--mkt-text)]">
                      {line.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
