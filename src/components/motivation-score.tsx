import { cn } from "@/lib/utils";
import { MOTIVATION_SCORE_FILTER } from "@/lib/leads/motivation-filter";

export function MotivationScore({
  score,
  showEmpty = false,
}: {
  score: number | null;
  showEmpty?: boolean;
}) {
  if (score == null) {
    if (!showEmpty) return null;
    return (
      <span className="text-xs text-muted-foreground">
        Motivation score not set
      </span>
    );
  }

  const hot = score >= MOTIVATION_SCORE_FILTER;

  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums",
        hot
          ? "border-transparent bg-hot-subtle text-hot"
          : "border-border bg-muted text-muted-foreground",
      )}
    >
      Motivation score {score}
    </span>
  );
}
