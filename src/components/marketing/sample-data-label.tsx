import { cn } from "@/lib/utils";

export function SampleDataLabel({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border border-[color:var(--mkt-border)] bg-[var(--mkt-bg2)] px-1.5 py-[3px] font-mono text-[9px] leading-none font-medium tracking-[0.04em] text-[var(--mkt-text3)]",
        className,
      )}
    >
      Sample data
    </span>
  );
}
