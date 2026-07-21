import {
  DEMO_DASHBOARD_KPIS,
  DEMO_SCORECARD,
} from "@/components/marketing/mock/mock-data";

/** Static TV KPI wall: oversized numbers for the sales-floor screen. */
export function MockTvWall() {
  const [leader, runnerUp] = DEMO_SCORECARD;

  return (
    <div className="flex flex-col gap-3 bg-background/60 p-4" aria-hidden>
      <div className="flex items-center justify-between px-1">
        <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
          Vesperwise · KPI wall
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-hot">
          <span className="size-1.5 rounded-full bg-hot" />
          Live
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {DEMO_DASHBOARD_KPIS.map((kpi) => (
          <div
            key={kpi.label}
            className="flex flex-col items-center gap-1 rounded-lg bg-card p-4 ring-1 ring-foreground/10"
          >
            <p className="text-2xl font-semibold tabular-nums sm:text-3xl">
              {kpi.value}
            </p>
            <p className="text-center text-[9px] text-muted-foreground uppercase">
              {kpi.label}
            </p>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between rounded-lg bg-card px-4 py-3 ring-1 ring-foreground/10">
        <div className="flex items-center gap-2">
          <span className="text-sm">🏆</span>
          <span className="text-[11px] font-medium">{leader.name}</span>
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {leader.dials} dials
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {runnerUp.name} · {runnerUp.dials} dials
        </span>
      </div>
    </div>
  );
}
