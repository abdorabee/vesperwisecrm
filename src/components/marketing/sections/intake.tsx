import { MARKETING_INTAKE_SOURCES } from "@/components/marketing/mock/mock-data";
import { MockSearchPanel } from "@/components/marketing/mock/mock-search-panel";
import { Reveal } from "@/components/marketing/motion/reveal";
import { Stagger, StaggerItem } from "@/components/marketing/motion/stagger";

export function Intake() {
  return (
    <section id="ch1" className="mkt-divider scroll-mt-24 bg-[var(--mkt-bg)]">
      <div className="mx-auto max-w-[1240px] px-7 py-24 sm:py-28">
        <Reveal className="grid min-w-0 items-end gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(340px,470px)]">
          <div className="min-w-0">
            <div className="flex items-baseline gap-3.5">
              <span className="font-mono text-[clamp(30px,3.4vw,44px)] leading-none font-normal tracking-normal text-[var(--mkt-text3)]">
                1.0
              </span>
              <h2 className="font-sans text-[clamp(30px,3.4vw,44px)] leading-none font-normal tracking-normal text-[var(--mkt-text)]">
                Intake
              </h2>
            </div>
            <p className="mt-5 max-w-[42ch] font-sans text-[17px] leading-[1.6] font-light text-[var(--mkt-text2)]">
              Pull leads from every channel and enrich them on arrival. Skip
              tracing, owner data and property context are appended before the
              record reaches a rep.
            </p>
          </div>

          <Stagger className="grid min-w-0 border-t border-[color:var(--mkt-border)]">
            {MARKETING_INTAKE_SOURCES.map((source) => (
              <StaggerItem
                key={source.n}
                className="grid grid-cols-[26px_minmax(0,1fr)_auto] items-center gap-4 border-b border-[color:var(--mkt-border-subtle)] py-4"
              >
                <span className="font-mono text-[10.5px] leading-none text-[var(--mkt-text3)]">
                  {source.n}
                </span>
                <span className="font-sans text-[14.5px] leading-snug text-[var(--mkt-text)]">
                  {source.label}
                </span>
                <span className="font-mono text-[11.5px] leading-none text-[var(--mkt-text3)]">
                  {source.meta}
                </span>
              </StaggerItem>
            ))}
          </Stagger>
        </Reveal>

        <Reveal delay={0.12} className="mt-12 min-w-0">
          <MockSearchPanel />
        </Reveal>
      </div>
    </section>
  );
}
