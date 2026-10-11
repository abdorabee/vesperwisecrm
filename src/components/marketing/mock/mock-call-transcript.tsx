import {
  MARKETING_QUALIFY_TAGS,
  MARKETING_SELECTED_LEAD,
} from "@/components/marketing/mock/mock-data";
import { Stagger, StaggerItem } from "@/components/marketing/motion/stagger";

const RECORD_FIELDS = [
  { label: "TITLE", value: MARKETING_SELECTED_LEAD.title },
  { label: "CONTACT", value: MARKETING_SELECTED_LEAD.contact },
  { label: "OWNER", value: MARKETING_SELECTED_LEAD.owner },
  { label: "STAGE", value: MARKETING_SELECTED_LEAD.stage },
] as const;

export function MockCallTranscript() {
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-[color:var(--mkt-border)] bg-[var(--mkt-surface)]">
      <div className="flex h-[42px] items-center gap-[9px] border-b border-[color:var(--mkt-border-subtle)] bg-[var(--mkt-raised)] px-4">
        <span className="mkt-pulse block size-[5px] rounded-full bg-[var(--mkt-accent)]" />
        <span className="font-mono text-[11.5px] leading-none text-[var(--mkt-text3)]">
          LEAD · {MARKETING_SELECTED_LEAD.title.toUpperCase()}
        </span>
        <span className="ml-auto hidden font-mono text-[11px] leading-none text-[var(--mkt-text3)] sm:block">
          {MARKETING_SELECTED_LEAD.stage.toUpperCase()}
        </span>
      </div>

      <div className="p-5 px-[18px]">
        <div className="font-mono text-[10.5px] leading-none font-medium tracking-normal text-[var(--mkt-text3)]">
          ON THE RECORD
        </div>
        <p className="mt-3 font-sans text-[14.5px] leading-[1.6] text-[var(--mkt-text)]">
          The pipeline card shows the lead title, the contact, the owner, and
          the stage. Notes you enter stay on that same record.
        </p>

        <Stagger className="mt-5 grid overflow-hidden rounded-[9px] border border-[color:var(--mkt-border-subtle)] bg-[var(--mkt-border-subtle)] [gap:1px] sm:grid-cols-2 xl:grid-cols-4">
          {RECORD_FIELDS.map((field) => (
            <StaggerItem
              key={field.label}
              className="bg-[var(--mkt-surface)] p-3 py-[13px]"
            >
              <div className="font-mono text-[10px] leading-none tracking-normal text-[var(--mkt-text3)]">
                {field.label}
              </div>
              <div className="my-2 font-sans text-[15px] leading-snug font-medium tracking-normal text-[var(--mkt-text)]">
                {field.value}
              </div>
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
