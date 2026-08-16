import { cn } from "@/lib/utils";

export interface MarketingRepRow {
  name: string;
  dials: string;
  contacts: string;
  appts: string;
  contracts: string;
  hot?: boolean;
}

export const MARKETING_REP_ROWS: MarketingRepRow[] = [
  {
    name: "Dana Reyes",
    dials: "1,942",
    contacts: "421",
    appts: "58",
    contracts: "14",
    hot: true,
  },
  {
    name: "Marcus Ju",
    dials: "1,708",
    contacts: "364",
    appts: "49",
    contracts: "11",
    hot: true,
  },
  {
    name: "Aisha Karim",
    dials: "1,455",
    contacts: "298",
    appts: "37",
    contracts: "6",
  },
  {
    name: "Owen Brandt",
    dials: "1,120",
    contacts: "204",
    appts: "22",
    contracts: "3",
  },
  {
    name: "Nina Sokolov",
    dials: "864",
    contacts: "151",
    appts: "14",
    contracts: "0",
  },
];

const REP_GRID_CLASS =
  "grid-cols-[minmax(0,1fr)_72px_84px] sm:grid-cols-[minmax(0,1.2fr)_96px_96px_96px_110px]";

export function MockRepLeaderboard() {
  return (
    <div className="min-w-0" aria-hidden>
      <PanelHeader
        caption="FIG 6.3 — REP ACTIVITY VS OUTCOMES"
        meta="LAST 90 DAYS · ALL MARKETS"
      />

      <div className="pt-1.5">
        <div
          className={cn(
            "grid h-[34px] items-center gap-0 border-b border-[color:var(--mkt-border-subtle)] bg-[var(--mkt-bg2)] px-5",
            REP_GRID_CLASS,
          )}
        >
          <span className="font-mono text-[10.5px] font-medium tracking-[0.07em] text-[var(--mkt-text3)]">
            REP
          </span>
          <HeaderCell>DIALS</HeaderCell>
          <HeaderCell className="hidden sm:block">CONTACTS</HeaderCell>
          <HeaderCell>APPTS</HeaderCell>
          <HeaderCell className="hidden sm:block">CONTRACTS</HeaderCell>
        </div>

        {MARKETING_REP_ROWS.map((row) => (
          <div
            key={row.name}
            className={cn(
              "grid h-[50px] items-center border-b border-[color:var(--mkt-border-subtle)] px-5 transition-colors hover:bg-[var(--mkt-bg2)]",
              REP_GRID_CLASS,
            )}
          >
            <span className="truncate text-[13px] font-medium leading-none text-[var(--mkt-text)]">
              {row.name}
            </span>
            <DataCell>{row.dials}</DataCell>
            <DataCell className="hidden sm:block">{row.contacts}</DataCell>
            <DataCell>{row.appts}</DataCell>
            <div className="hidden justify-end sm:flex">
              <span
                className={cn(
                  "rounded-[5px] px-2 py-1 font-mono text-xs font-medium leading-none",
                  row.hot
                    ? "bg-[var(--mkt-accent)] text-[var(--mkt-accent-ink)]"
                    : "bg-transparent text-[var(--mkt-text2)]",
                )}
              >
                {row.contracts}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface CellProps {
  children: string;
  className?: string;
}

function HeaderCell({ children, className }: CellProps) {
  return (
    <span
      className={cn(
        "text-right font-mono text-[10.5px] font-medium tracking-[0.07em] text-[var(--mkt-text3)]",
        className,
      )}
    >
      {children}
    </span>
  );
}

function DataCell({ children, className }: CellProps) {
  return (
    <span
      className={cn(
        "text-right font-mono text-[12.5px] text-[var(--mkt-text2)]",
        className,
      )}
    >
      {children}
    </span>
  );
}

interface PanelHeaderProps {
  caption: string;
  meta: string;
}

function PanelHeader({ caption, meta }: PanelHeaderProps) {
  return (
    <div className="flex min-h-11 items-center gap-4 border-b border-[color:var(--mkt-border-subtle)] bg-[var(--mkt-raised)] px-[18px] py-2">
      <span className="min-w-0 font-mono text-[10.5px] font-medium tracking-[0.09em] text-[var(--mkt-text3)]">
        {caption}
      </span>
      <span className="ml-auto hidden font-mono text-[10.5px] text-[var(--mkt-text3)] sm:block">
        {meta}
      </span>
    </div>
  );
}
