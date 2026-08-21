import { Reveal } from "@/components/marketing/motion/reveal";

export function Testimonials() {
  return (
    <section className="mkt-divider bg-[var(--mkt-bg2)] text-[var(--mkt-text)]">
      <div className="mx-auto max-w-[1240px] px-7 py-24 sm:py-28">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-[10.5px] leading-none font-medium tracking-[0.1em] text-[var(--mkt-text3)]">
                8.0 — EARLY ACCESS
              </span>
            </div>
            <h2 className="mt-5 max-w-[20ch] font-sans text-[clamp(30px,3.4vw,44px)] leading-[1.05] font-normal tracking-normal text-balance text-[var(--mkt-text)]">
              Join the pilot program.
            </h2>
          </div>
        </Reveal>

        <div className="mt-12 rounded-[14px] border border-[color:var(--mkt-border)] bg-[var(--mkt-surface)] p-8 shadow-[0_18px_50px_color-mix(in_oklch,var(--mkt-text)_6%,transparent)]">
          <p className="font-sans text-[15px] leading-[1.65] font-light text-[var(--mkt-text2)]">
            VesperWiseCRM is in early access. Pipeline management, email sequences, and the lead queue are live.
            Book a demo to see the platform, discuss your workflow, and get onboarding support during the pilot phase.
          </p>
        </div>
      </div>
    </section>
  );
}
