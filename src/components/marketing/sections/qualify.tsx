import { RecordFigure } from "@/components/marketing/figures/record-figure";
import { Reveal } from "@/components/marketing/motion/reveal";

export function Qualify() {
  return (
    <section
      id="ch2"
      className="mkt-divider scroll-mt-24 bg-[var(--mkt-bg2)]"
    >
      <div className="mx-auto max-w-[1240px] px-7 py-24 sm:py-28">
        <Reveal>
          <div className="flex items-baseline gap-3.5">
            <span className="font-mono text-[clamp(30px,3.4vw,44px)] leading-none font-normal tracking-normal text-[var(--mkt-text3)]">
              2.0
            </span>
            <h2 className="font-sans text-[clamp(30px,3.4vw,44px)] leading-none font-normal tracking-normal text-[var(--mkt-text)]">
              Qualify
            </h2>
          </div>
          <p className="mt-5 max-w-[52ch] font-sans text-[17px] leading-[1.6] font-light text-[var(--mkt-text2)]">
            Qualification stays on the lead: motivation, condition, timeline,
            and price, written back to the record with the next task.
          </p>
        </Reveal>

        <Reveal delay={0.12} className="mt-12 min-w-0">
          <div className="mb-3 flex items-end justify-between gap-4">
            <span className="font-mono text-[10.5px] leading-none font-medium tracking-normal text-[var(--mkt-text3)]">
              FIG 2.1 — RECORD, LAYERED
            </span>
            <span className="font-mono text-[10.5px] leading-none text-[var(--mkt-text3)]">
              HOVER A LAYER
            </span>
          </div>
          <div className="rounded-2xl border border-[color:var(--mkt-border)] bg-[var(--mkt-surface)] px-2.5 py-3.5">
            <RecordFigure />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
