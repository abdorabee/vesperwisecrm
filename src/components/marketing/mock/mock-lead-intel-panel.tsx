import { MARKETING_SELECTED_LEAD } from "@/components/marketing/mock/mock-data";

const LEAD_FIELDS = [
  { label: "Title", value: MARKETING_SELECTED_LEAD.title },
  { label: "Contact", value: MARKETING_SELECTED_LEAD.contact },
  { label: "Owner", value: MARKETING_SELECTED_LEAD.owner },
  { label: "Stage", value: MARKETING_SELECTED_LEAD.stage },
] as const;

export function MockLeadIntelPanel() {
  return (
    <aside className="min-w-0 bg-[var(--mkt-raised)]">
      <div className="border-b border-[color:var(--mkt-border-subtle)] px-4 py-4 sm:px-[18px]">
        <div className="font-mono text-[10.5px] font-medium tracking-[0.09em] text-[var(--mkt-text3)] uppercase">
          Pipeline card
        </div>
        <div className="mt-2.5 font-sans text-[15px] leading-snug font-medium text-[var(--mkt-text)]">
          {MARKETING_SELECTED_LEAD.title}
        </div>
        <div className="mt-1 font-sans text-xs leading-snug text-[var(--mkt-text3)]">
          {MARKETING_SELECTED_LEAD.contact}
        </div>
      </div>

      <div className="grid gap-3 px-4 py-4 sm:px-[18px]">
        {LEAD_FIELDS.map((field) => (
          <div key={field.label} className="flex items-baseline justify-between gap-3">
            <span className="font-mono text-[10.5px] leading-none tracking-[0.06em] text-[var(--mkt-text3)] uppercase">
              {field.label}
            </span>
            <span className="text-right font-sans text-[13px] leading-snug font-medium text-[var(--mkt-text)]">
              {field.value}
            </span>
          </div>
        ))}
      </div>
    </aside>
  );
}
