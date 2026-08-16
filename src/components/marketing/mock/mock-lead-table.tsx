import {
  MARKETING_HERO_ROWS,
  type MarketingHeroLeadRow,
} from "@/components/marketing/mock/mock-data";
import { cn } from "@/lib/utils";

const LEAD_TABLE_COLUMNS =
  "grid-cols-[minmax(210px,2.1fr)_minmax(92px,0.9fr)_minmax(118px,1fr)_minmax(72px,0.6fr)_minmax(96px,0.8fr)]";

const COLUMN_HEADERS = [
  "SELLER / PROPERTY",
  "SOURCE",
  "STAGE",
  "SCORE",
  "LAST TOUCH",
];

function isHighScore(row: MarketingHeroLeadRow): boolean {
  return row.score >= 85;
}

export function MockLeadTable() {
  return (
    <div className="min-w-0 overflow-x-auto">
      <div className="min-w-[760px]">
        <div
          className={cn(
            "grid h-9 items-center gap-0 border-b border-[color:var(--mkt-border-subtle)] bg-[var(--mkt-bg2)] px-4",
            LEAD_TABLE_COLUMNS,
          )}
        >
          {COLUMN_HEADERS.map((header) => (
            <span
              key={header}
              className={cn(
                "truncate font-mono text-[10.5px] font-medium tracking-[0.07em] text-[var(--mkt-text3)]",
                header === "SCORE" || header === "LAST TOUCH" ? "text-right" : "",
              )}
            >
              {header}
            </span>
          ))}
        </div>

        {MARKETING_HERO_ROWS.map((row) => {
          const highScore = isHighScore(row);

          return (
            <div
              key={`${row.name}-${row.address}`}
              className={cn(
                "grid h-[52px] items-center gap-0 border-b border-[color:var(--mkt-border-subtle)] px-4 transition-colors duration-150 hover:bg-[var(--mkt-bg2)]",
                LEAD_TABLE_COLUMNS,
                row.selected ? "bg-[var(--mkt-accent-soft)]" : "bg-transparent",
              )}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className={cn(
                    "h-5 w-[3px] shrink-0 rounded-sm",
                    row.selected ? "bg-[var(--mkt-accent)]" : "bg-transparent",
                  )}
                />
                <div className="min-w-0">
                  <div className="truncate font-sans text-[13px] leading-tight font-medium text-[var(--mkt-text)]">
                    {row.name}
                  </div>
                  <div className="mt-1 truncate font-sans text-[11.5px] leading-tight text-[var(--mkt-text3)]">
                    {row.address}
                  </div>
                </div>
              </div>

              <span className="truncate font-mono text-[11.5px] text-[var(--mkt-text2)]">
                {row.source}
              </span>

              <span className="flex min-w-0 items-center gap-2 font-sans text-xs text-[var(--mkt-text2)]">
                <span
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    highScore ? "bg-[var(--mkt-accent)]" : "bg-[var(--mkt-border-strong)]",
                  )}
                />
                <span className="truncate">{row.stage}</span>
              </span>

              <div className="flex justify-end">
                <span
                  className={cn(
                    "rounded-[5px] border px-2 py-1 font-mono text-[11.5px] leading-none font-medium tabular-nums",
                    highScore
                      ? "border-[color:var(--mkt-accent)] bg-[var(--mkt-accent)] text-[var(--mkt-accent-ink)]"
                      : "border-[color:var(--mkt-border-subtle)] bg-transparent text-[var(--mkt-text2)]",
                  )}
                >
                  {row.score}
                </span>
              </div>

              <span className="truncate text-right font-mono text-[11.5px] text-[var(--mkt-text3)]">
                {row.touch}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
