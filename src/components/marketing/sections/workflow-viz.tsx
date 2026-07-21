import {
  BarChart3,
  Handshake,
  Inbox,
  Kanban,
  ScanSearch,
  Send,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Stagger, StaggerItem } from "@/components/marketing/motion/stagger";
import { SectionHeading } from "@/components/marketing/section-heading";

interface WorkflowStep {
  icon: LucideIcon;
  label: string;
  description: string;
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  { icon: Inbox, label: "Capture", description: "Forms, API, imports" },
  { icon: ScanSearch, label: "Qualify", description: "AI scores every lead" },
  { icon: Kanban, label: "Manage", description: "One shared pipeline" },
  { icon: Send, label: "Automate", description: "Email & SMS sequences" },
  { icon: Handshake, label: "Close", description: "Deals under contract" },
  { icon: BarChart3, label: "Analyze", description: "Scorecards & KPI wall" },
];

export function WorkflowViz() {
  return (
    <section className="divider-quiet border-y py-24 sm:py-32">
      <div className="mx-auto flex max-w-6xl flex-col gap-14 px-4 sm:px-6">
        <SectionHeading
          eyebrow="How it works"
          title="One loop, from raw lead to closed deal."
        />

        <div className="relative">
          <svg
            className="absolute top-6 right-[8%] left-[8%] hidden h-px w-[84%] lg:block"
            aria-hidden
            preserveAspectRatio="none"
            viewBox="0 0 100 1"
          >
            <line
              x1="0"
              y1="0.5"
              x2="100"
              y2="0.5"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="1"
              strokeDasharray="4 4"
              vectorEffect="non-scaling-stroke"
              className="marketing-dash"
            />
          </svg>

          <Stagger className="relative grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
            {WORKFLOW_STEPS.map((step) => (
              <StaggerItem
                key={step.label}
                className="flex flex-col items-center gap-3 text-center"
              >
                <span className="flex size-12 items-center justify-center rounded-xl surface-subtle ring-1 ring-foreground/10">
                  <step.icon className="size-5 text-foreground/80" />
                </span>
                <div>
                  <p className="text-sm font-medium">{step.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </div>
    </section>
  );
}
