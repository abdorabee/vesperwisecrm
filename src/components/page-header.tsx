import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * A page's title, supporting line and primary actions.
 *
 * No bottom margin: every call site renders this as the first child of a
 * `flex flex-col gap-6`, so an `mb-6` here stacked on top of that gap and pushed
 * the header 48px off its page instead of 24px.
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <h1 className="truncate text-2xl leading-tight font-semibold tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-pretty text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
