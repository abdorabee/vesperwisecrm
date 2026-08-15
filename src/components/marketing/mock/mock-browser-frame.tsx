import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface MockBrowserFrameProps {
  children: ReactNode;
  title?: string;
  url?: string;
  actions?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** Window chrome (traffic dots + URL pill) wrapping any product mockup. */
export function MockBrowserFrame({
  children,
  title,
  url = "app.vesperwise.com",
  actions,
  className,
  style,
}: MockBrowserFrameProps) {
  return (
    <div
      className={cn(
        "min-w-0 overflow-hidden rounded-xl bg-[var(--mkt-surface)] ring-1 ring-[color:var(--mkt-border)]",
        className,
      )}
      style={style}
      aria-hidden
    >
      <div className="flex min-h-10 items-center gap-3 border-b border-[color:var(--mkt-border-subtle)] bg-[var(--mkt-raised)] px-4 py-2.5">
        <div className="flex shrink-0 gap-1.5">
          <span className="size-2 rounded-full bg-[var(--mkt-border-strong)]" />
          <span className="size-2 rounded-full bg-[var(--mkt-border)]" />
          <span className="size-2 rounded-full bg-[var(--mkt-border)]" />
        </div>
        <div className="ml-1 flex min-w-0 flex-1 items-center gap-2 font-mono text-[11px] text-[var(--mkt-text3)]">
          <span className="size-1.5 shrink-0 rounded-full bg-[var(--mkt-accent)]" />
          <span className="truncate">{title ?? url}</span>
        </div>
        {actions ? <div className="hidden shrink-0 items-center gap-1.5 md:flex">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}
