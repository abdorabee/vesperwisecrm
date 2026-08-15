"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

import {
  getAppearanceToggleCopy,
  getNextAppearance,
  type Appearance,
} from "@/lib/appearance";
import { cn } from "@/lib/utils";

interface MarketingAppearanceControl {
  appearance: Appearance;
  copy: ReturnType<typeof getAppearanceToggleCopy>;
  mounted: boolean;
  nextAppearance: Appearance;
  toggle: () => void;
}

interface MarketingThemeToggleProps {
  className?: string;
}

function subscribeToClient(): () => void {
  return () => undefined;
}

function useMarketingAppearanceControl(): MarketingAppearanceControl {
  const mounted = useSyncExternalStore(subscribeToClient, () => true, () => false);
  const { resolvedTheme, setTheme } = useTheme();
  const appearance: Appearance = resolvedTheme === "dark" ? "dark" : "light";
  const copy = getAppearanceToggleCopy(appearance);
  const nextAppearance = getNextAppearance(appearance);

  return {
    appearance,
    copy,
    mounted,
    nextAppearance,
    toggle: () => setTheme(nextAppearance),
  };
}

export function MarketingThemeToggle({ className }: MarketingThemeToggleProps) {
  const { copy, mounted, nextAppearance, toggle } = useMarketingAppearanceControl();
  const nextLabel = nextAppearance.toUpperCase();

  return (
    <button
      type="button"
      disabled={!mounted}
      aria-label={mounted ? copy.actionLabel : "Loading appearance preference"}
      title={mounted ? copy.actionLabel : undefined}
      onClick={toggle}
      className={cn(
        "min-w-14 cursor-pointer rounded-md border border-[color:var(--mkt-border-subtle)] px-2.5 py-1.5 font-mono text-[10px] tracking-[0.09em] text-[var(--mkt-text3)] uppercase transition-colors hover:border-[color:var(--mkt-border)] hover:text-[var(--mkt-text)] disabled:pointer-events-none disabled:opacity-0",
        className,
      )}
    >
      {mounted ? nextLabel : <span aria-hidden="true">LIGHT</span>}
    </button>
  );
}
