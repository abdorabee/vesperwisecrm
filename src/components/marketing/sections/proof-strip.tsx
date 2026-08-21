import {
  MARKETING_PROOF_LABEL,
  MARKETING_PROOF_LOGOS,
  MARKETING_PROOF_PLACEHOLDER_TAG,
} from "@/components/marketing/mock/mock-data";

export function ProofStrip() {
  return (
    <section
      id="proof"
      className="mkt-divider bg-[var(--mkt-bg2)] text-[var(--mkt-text)]"
    >
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-9 gap-y-5 px-4 py-7 sm:px-7">
        <span className="max-w-[17ch] font-mono text-[10.5px] leading-[1.5] font-medium tracking-[0.09em] text-[var(--mkt-text3)]">
          {MARKETING_PROOF_LABEL}
        </span>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-8 gap-y-3">
          <span className="font-sans text-sm leading-[1.4] font-light text-[var(--mkt-text2)]">
            Pipeline, email sequences, and lead queue are live. Book a demo to see the platform and join the pilot program.
          </span>
        </div>
      </div>
    </section>
  );
}
