import { cn } from "@/lib/utils"

export interface BarListItem {
  id: string
  label: string
  value: number
  /** Full label for the native tooltip when `label` is visually truncated. */
  title?: string
}

interface BarListProps {
  items: BarListItem[]
  /** Shown when `items` is empty. Say what would fill it, not just "no data". */
  emptyMessage: string
  className?: string
}

/** Stagger reads as a cascade at 40ms and as a queue much past that. */
const STAGGER_MS = 40
const STAGGER_CAP_MS = 400

/**
 * A ranked list of labelled magnitudes.
 *
 * The fill uses `--data-fill` rather than `--primary`: `--primary` is the acid
 * lime that means "interactive" everywhere else in the product, and it measures
 * 1.14:1 against a white card, which cannot carry a bar in light mode.
 *
 * Columns are a grid so the label, track and value align on shared edges across
 * every row, and the value column is sized to its content — a fixed `w-6` clipped
 * any count of 100 or more.
 */
export function BarList({ items, emptyMessage, className }: BarListProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-balance text-muted-foreground">
        {emptyMessage}
      </p>
    )
  }

  const max = Math.max(1, ...items.map((item) => item.value))

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      {items.map((item, index) => (
        <div
          key={item.id}
          className="grid grid-cols-[minmax(0,8rem)_1fr_auto] items-center gap-3"
        >
          <span className="truncate text-sm" title={item.title ?? item.label}>
            {item.label}
          </span>
          <div className="h-1.5 overflow-hidden rounded-full bg-(--data-track)">
            <div
              className="bar-fill h-full rounded-full bg-(--data-fill)"
              style={{
                // A rounded 1.5px-tall fill narrower than its own height renders
                // as a dot rather than a bar, so a real but small value looks
                // like a rendering artifact. Floor it at a readable pill; the
                // exact count sits next to it, so nothing is hidden by rounding.
                // Zero stays zero — an empty track is the honest reading there.
                width:
                  item.value === 0
                    ? "0%"
                    : `max(${(item.value / max) * 100}%, 0.5rem)`,
                animationDelay: `${Math.min(index * STAGGER_MS, STAGGER_CAP_MS)}ms`,
              }}
            />
          </div>
          <span className="numeric min-w-10 text-right text-sm text-muted-foreground">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  )
}
