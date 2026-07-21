import { Mail, MessageSquare, PhoneCall } from "lucide-react";

import {
  DEMO_SEQUENCE,
  type DemoSequenceStep,
} from "@/components/marketing/mock/mock-data";
import { cn } from "@/lib/utils";

const CHANNEL_ICONS = {
  email: Mail,
  sms: MessageSquare,
  call: PhoneCall,
} as const;

const STATUS_STYLES: Record<DemoSequenceStep["status"], string> = {
  sent: "bg-hot",
  scheduled: "bg-warm",
  waiting: "bg-cold",
};

const STATUS_LABELS: Record<DemoSequenceStep["status"], string> = {
  sent: "Sent",
  scheduled: "Scheduled",
  waiting: "Waiting",
};

/** Static follow-up sequence timeline with channel icons and status dots. */
export function MockSequence() {
  return (
    <div className="flex flex-col gap-1 bg-background/60 p-4" aria-hidden>
      {DEMO_SEQUENCE.map((step, index) => {
        const Icon = CHANNEL_ICONS[step.channel];
        const isLast = index === DEMO_SEQUENCE.length - 1;

        return (
          <div key={step.label} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-card ring-1 ring-foreground/10">
                <Icon className="size-3.5 text-muted-foreground" />
              </span>
              {!isLast && <span className="w-px flex-1 bg-border" />}
            </div>
            <div className="flex flex-1 items-center justify-between gap-2 pt-1 pb-4">
              <div className="min-w-0">
                <p className="truncate text-[11px] font-medium">{step.label}</p>
                <p className="text-[10px] text-muted-foreground">
                  {step.timing}
                </p>
              </div>
              <span className="flex shrink-0 items-center gap-1.5 text-[10px] text-muted-foreground">
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    STATUS_STYLES[step.status],
                  )}
                />
                {STATUS_LABELS[step.status]}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
