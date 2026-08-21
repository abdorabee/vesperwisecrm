import { MARKETING_ENGAGE_STATS } from "@/components/marketing/mock/mock-data";
import { MockPowerDial } from "@/components/marketing/mock/mock-power-dial";
import { Reveal } from "@/components/marketing/motion/reveal";
import { Stagger, StaggerItem } from "@/components/marketing/motion/stagger";

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
                Engage
              </h2>
            </div>
            <p className="mt-5 max-w-[38ch] font-sans text-[17px] leading-[1.6] font-light text-[var(--mkt-text2)]">
              Email sequences and callback tasks write to the same timeline.
              Track every touch on one record so the next action is never a guess.
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
                FIG 3.1 — DIALER SESSION + SEQUENCE
              </span>
            </div>
            <MockPowerDial />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
