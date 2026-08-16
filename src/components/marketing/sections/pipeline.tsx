import { MockPipelineBoard } from "@/components/marketing/mock/mock-pipeline-board";
import { Reveal } from "@/components/marketing/motion/reveal";

export function Pipeline() {
  return (
    <section id="ch4" className="mkt-divider bg-[var(--mkt-bg2)] scroll-mt-24">
      <div className="mx-auto max-w-[1240px] px-7 py-24 sm:py-28">
        <Reveal className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="flex items-baseline gap-3.5">
              <span className="font-mono text-[clamp(30px,3.4vw,44px)] leading-none tracking-[-0.03em] text-[var(--mkt-text3)]">
                4.0
              </span>
              <h2 className="font-sans text-[clamp(30px,3.4vw,44px)] font-normal leading-none tracking-[-0.032em] text-[var(--mkt-text)]">
                Pipeline
              </h2>
            </div>
            <p className="mt-5 max-w-[46ch] text-[17px] font-light leading-[1.6] text-[var(--mkt-text2)]">
              Offers, contracts and closings tracked by stage — with the aging,
              assigned rep and expected spread visible on the card, not buried
              in a record.
            </p>
          </div>
          <span className="font-mono text-[10.5px] font-medium tracking-[0.1em] text-[var(--mkt-text3)]">
            FIG 4.1 — PIPELINE / ACQUISITIONS Q3
          </span>
        </Reveal>

        <Reveal delay={0.08} className="mt-12 min-w-0">
          <MockPipelineBoard />
        </Reveal>
      </div>
    </section>
  );
}
