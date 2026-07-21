import {
  ClipboardCheck,
  FolderKanban,
  Kanban,
  Mail,
  Trophy,
  Workflow,
} from "lucide-react";

import {
  DEMO_DASHBOARD_KPIS,
  DEMO_STAGE_BARS,
} from "@/components/marketing/mock/mock-data";

const SIDEBAR_ICONS = [
  { icon: FolderKanban, isActive: true },
  { icon: Kanban, isActive: false },
  { icon: ClipboardCheck, isActive: false },
  { icon: Mail, isActive: false },
  { icon: Workflow, isActive: false },
  { icon: Trophy, isActive: false },
];

const maxStageCount = Math.max(...DEMO_STAGE_BARS.map((bar) => bar.count));

/** Static replica of the real dashboard: sidebar, KPI grid, stage bar chart. */
export function MockDashboard() {
  return (
    <div className="flex bg-background/60" aria-hidden>
      <div className="flex flex-col items-center gap-1 border-r border-border bg-sidebar px-2 py-3">
        <span className="mb-2 flex size-7 items-center justify-center bg-primary text-[10px] font-bold text-primary-foreground">
          W
        </span>
        {SIDEBAR_ICONS.map(({ icon: Icon, isActive }, index) => (
          <span
            key={index}
            className={
              isActive
                ? "flex size-7 items-center justify-center rounded-md bg-sidebar-accent text-sidebar-foreground"
                : "flex size-7 items-center justify-center rounded-md text-muted-foreground"
            }
          >
            <Icon className="size-3.5" />
          </span>
        ))}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Dashboard</span>
          <span className="rounded-md bg-primary px-2.5 py-1 text-[10px] font-medium text-primary-foreground">
            Go to pipeline
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {DEMO_DASHBOARD_KPIS.map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-lg bg-card p-3 ring-1 ring-foreground/10"
            >
              <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {kpi.value}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-lg bg-card p-3 ring-1 ring-foreground/10">
          <p className="text-[10px] font-medium text-muted-foreground">
            Leads by stage
          </p>
          <div className="mt-2.5 flex flex-col gap-2">
            {DEMO_STAGE_BARS.map((bar) => (
              <div key={bar.label} className="flex items-center gap-2">
                <span className="w-20 text-[10px] text-muted-foreground">
                  {bar.label}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${(bar.count / maxStageCount) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right text-[10px] tabular-nums">
                  {bar.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
