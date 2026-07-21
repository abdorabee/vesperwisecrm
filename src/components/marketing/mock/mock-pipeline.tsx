import { DEMO_PIPELINE } from "@/components/marketing/mock/mock-data";

/** Static kanban replica: stage columns with $value cards and % match badges. */
export function MockPipeline() {
  return (
    <div className="flex gap-3 overflow-hidden bg-background/60 p-4" aria-hidden>
      {DEMO_PIPELINE.map((column) => (
        <div key={column.stage} className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-medium text-muted-foreground uppercase">
              {column.stage}
            </span>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {column.cards.length}
            </span>
          </div>
          {column.cards.map((card) => (
            <div
              key={card.title}
              className="flex flex-col gap-1.5 rounded-lg bg-card p-2.5 ring-1 ring-foreground/10"
            >
              <p className="truncate text-[11px] font-medium">{card.title}</p>
              <p className="text-[11px] text-muted-foreground tabular-nums">
                {card.value}
              </p>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-primary px-1.5 py-px text-[9px] font-medium text-primary-foreground">
                  {card.match}% match
                </span>
                <span className="flex size-4.5 items-center justify-center rounded-full bg-muted text-[8px] text-muted-foreground">
                  {card.owner}
                </span>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
