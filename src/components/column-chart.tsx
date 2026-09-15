import { cn } from "@/lib/utils"

export interface ColumnChartPoint {
  id: string
  /** Axis label, e.g. a formatted date. */
  label: string
  value: number
}

interface ColumnChartProps {
  points: ColumnChartPoint[]
  /** Describes what one column counts, e.g. "touches". Used in the text alternative. */
  valueLabel: string
  emptyMessage: string
  className?: string
}

const STAGGER_MS = 30
const STAGGER_CAP_MS = 300

/**
 * A value over time.
 *
 * This series was previously rendered as horizontal bar rows with a date on each
 * row, which reads as a ranking rather than a trend — time belongs on the x axis.
 *
 * Only the first and last axis labels render, because a fortnight of dates cannot
 * fit legibly under a card and a partially-elided axis is worse than a clear
 * range. Every individual value stays reachable: on hover through the column's
 * title, and to a screen reader through the description list below, which is why
 * the columns themselves are hidden from assistive tech rather than given ARIA
 * roles that would only restate it.
 */
export function ColumnChart({
  points,
  valueLabel,
  emptyMessage,
  className,
}: ColumnChartProps) {
  if (points.length === 0) {
    return (
      <p className="text-sm text-balance text-muted-foreground">
        {emptyMessage}
      </p>
    )
  }

  const max = Math.max(1, ...points.map((point) => point.value))
  const first = points[0]
  const last = points[points.length - 1]

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div aria-hidden="true" className="flex h-28 items-end gap-1">
        {points.map((point, index) => (
          <div
            key={point.id}
            title={`${point.label}: ${point.value} ${valueLabel}`}
            className="group/column flex h-full flex-1 items-end"
          >
            <div
              className="column-fill w-full rounded-sm bg-(--data-fill) transition-opacity group-hover/column:opacity-70"
              style={{
                // A zero-value day still gets a visible sliver, so the axis reads
                // as a continuous series rather than a gap.
                height: `${Math.max((point.value / max) * 100, 2)}%`,
                animationDelay: `${Math.min(index * STAGGER_MS, STAGGER_CAP_MS)}ms`,
              }}
            />
          </div>
        ))}
      </div>
      <div
        aria-hidden="true"
        className="numeric flex justify-between text-xs text-muted-foreground"
      >
        <span>{first.label}</span>
        {points.length > 1 && <span>{last.label}</span>}
      </div>
      <dl className="sr-only">
        {points.map((point) => (
          <div key={point.id}>
            <dt>{point.label}</dt>
            <dd>
              {point.value} {valueLabel}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
