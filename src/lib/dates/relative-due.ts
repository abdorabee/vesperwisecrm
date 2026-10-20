const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const MONTH_MS = 30 * DAY_MS;
const YEAR_MS = 365 * DAY_MS;

const UNITS: { unit: Intl.RelativeTimeFormatUnit; ms: number }[] = [
  { unit: "year", ms: YEAR_MS },
  { unit: "month", ms: MONTH_MS },
  { unit: "day", ms: DAY_MS },
  { unit: "hour", ms: HOUR_MS },
  { unit: "minute", ms: MINUTE_MS },
];

export interface RelativeDue {
  label: string;
  overdue: boolean;
}

export function formatRelativeDue(dueAt: string, now = Date.now()): RelativeDue {
  const due = new Date(dueAt).getTime();
  if (Number.isNaN(due)) {
    return { label: "Due date unavailable", overdue: false };
  }

  const delta = due - now;
  if (Math.abs(delta) < MINUTE_MS) {
    return { label: "Due now", overdue: false };
  }

  const match =
    UNITS.find((entry) => Math.abs(delta) >= entry.ms) ?? UNITS[UNITS.length - 1];
  const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
    Math.round(delta / match.ms),
    match.unit,
  );

  if (delta < 0) {
    return { label: relative, overdue: true };
  }

  return { label: `Due ${relative}`, overdue: false };
}
