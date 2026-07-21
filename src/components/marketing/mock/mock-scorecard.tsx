import { DEMO_SCORECARD } from "@/components/marketing/mock/mock-data";

const maxDials = Math.max(...DEMO_SCORECARD.map((row) => row.dials));

/** Static team leaderboard: initials avatars + the app's h-2 progress-bar pattern. */
export function MockScorecard() {
  return (
    <div className="flex flex-col gap-2.5 bg-background/60 p-4" aria-hidden>
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-medium text-muted-foreground uppercase">
          This week&apos;s dials
        </span>
        <span className="text-[10px] text-muted-foreground">Deals</span>
      </div>
      {DEMO_SCORECARD.map((row, index) => (
        <div
          key={row.initials}
          className="flex items-center gap-3 rounded-lg bg-card px-3 py-2.5 ring-1 ring-foreground/10"
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] text-muted-foreground">
            {row.initials}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-[11px] font-medium">
                {index === 0 ? `${row.name} 🏆` : row.name}
              </p>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {row.dials}
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary"
                style={{ width: `${(row.dials / maxDials) * 100}%` }}
              />
            </div>
          </div>
          <span className="shrink-0 text-xs font-semibold tabular-nums">
            {row.deals}
          </span>
        </div>
      ))}
    </div>
  );
}
