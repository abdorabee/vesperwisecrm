import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface StatTileProps {
  label: string
  value: string | number
  /** Secondary line under the value, e.g. "12 won / 30 closed". */
  hint?: string
  className?: string
}

/**
 * A single headline metric.
 *
 * Label and value are one semantic group, so they sit tight together; the card's
 * own `--card-spacing` would push them 16px apart and break the pairing. The
 * value carries tabular figures because a metric that changes must not reflow the
 * row it sits in, and it stays at `text-2xl` so a grid of tiles never out-shouts
 * the page heading above it.
 */
export function StatTile({ label, value, hint, className }: StatTileProps) {
  return (
    <Card size="sm" className={cn("gap-0", className)}>
      <CardContent className="flex flex-col gap-1.5">
        <span className="text-xs font-medium tracking-[0.06em] text-muted-foreground uppercase">
          {label}
        </span>
        <span className="numeric text-2xl leading-none font-semibold text-foreground">
          {value}
        </span>
        {hint && (
          <span className="numeric pt-0.5 text-xs text-muted-foreground">
            {hint}
          </span>
        )}
      </CardContent>
    </Card>
  )
}
