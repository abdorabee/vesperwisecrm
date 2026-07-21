import {
  DEMO_QUEUE_LEADS,
  type LeadTemperature,
} from "@/components/marketing/mock/mock-data";
import { cn } from "@/lib/utils";

const TEMPERATURE_STYLES: Record<LeadTemperature, string> = {
  hot: "bg-hot-subtle text-hot border-[color:var(--hot-border)]",
  warm: "bg-warm-subtle text-warm border-[color:var(--warm-border)]",
  cold: "bg-cold-subtle text-cold border-[color:var(--cold-border)]",
};

/** Static lead-queue table with AI score badges. */
export function MockLeadQueue() {
  return (
    <div className="flex flex-col bg-background/60 p-4" aria-hidden>
      <div className="flex items-center justify-between px-2 pb-2">
        <span className="text-[10px] font-medium text-muted-foreground uppercase">
          Lead queue
        </span>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {DEMO_QUEUE_LEADS.length} waiting
        </span>
      </div>
      <div className="flex flex-col divide-y divide-border rounded-lg bg-card ring-1 ring-foreground/10">
        {DEMO_QUEUE_LEADS.map((lead) => (
          <div
            key={lead.name}
            className="flex items-center justify-between gap-2 px-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="truncate text-[11px] font-medium">{lead.name}</p>
              <p className="text-[10px] text-muted-foreground">{lead.source}</p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium tabular-nums",
                TEMPERATURE_STYLES[lead.temperature],
              )}
            >
              AI {lead.score}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
