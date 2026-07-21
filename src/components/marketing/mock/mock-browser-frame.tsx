import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface MockBrowserFrameProps {
  children: ReactNode;
  url?: string;
  className?: string;
  style?: CSSProperties;
}

/** Window chrome (traffic dots + URL pill) wrapping any product mockup. */
export function MockBrowserFrame({
  children,
  url = "app.vesperwise.com",
  className,
  style,
}: MockBrowserFrameProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10",
        className,
      )}
      style={style}
      aria-hidden
    >
      <div className="flex items-center gap-3 border-b border-border px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-destructive/60" />
          <span className="size-2.5 rounded-full bg-warm/60" />
          <span className="size-2.5 rounded-full bg-hot/60" />
        </div>
        <div className="flex h-6 flex-1 max-w-64 items-center justify-center rounded-md bg-muted px-3 font-mono text-[10px] text-muted-foreground">
          {url}
        </div>
      </div>
      {children}
    </div>
  );
}
