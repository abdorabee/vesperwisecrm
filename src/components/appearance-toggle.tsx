"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  getAppearanceToggleCopy,
  getNextAppearance,
  type Appearance,
} from "@/lib/appearance";
import { cn } from "@/lib/utils";

function subscribeToClient(): () => void {
  return () => undefined;
}

function useAppearanceControl() {
  const mounted = useSyncExternalStore(subscribeToClient, () => true, () => false);
  const { resolvedTheme, setTheme } = useTheme();
  const appearance: Appearance = resolvedTheme === "dark" ? "dark" : "light";
  const copy = getAppearanceToggleCopy(appearance);

  return {
    appearance,
    copy,
    mounted,
    toggle: () => setTheme(getNextAppearance(appearance)),
  };
}

function AppearanceIcon({ appearance }: { appearance: Appearance }) {
  return appearance === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />;
}

export function AppearanceMenuItem() {
  const { appearance, copy, mounted, toggle } = useAppearanceControl();

  return (
    <DropdownMenuItem
      disabled={!mounted}
      aria-label={mounted ? copy.actionLabel : "Loading appearance preference"}
      onClick={toggle}
    >
      <AppearanceIcon appearance={appearance} />
      <span>Appearance</span>
      <span className="ml-auto text-xs text-muted-foreground">{mounted ? copy.currentLabel : ""}</span>
    </DropdownMenuItem>
  );
}

export function AppearanceToggleButton({
  showLabel = false,
  className,
}: {
  showLabel?: boolean;
  className?: string;
}) {
  const { appearance, copy, mounted, toggle } = useAppearanceControl();

  return (
    <Button
      type="button"
      variant="ghost"
      size={showLabel ? "sm" : "icon"}
      disabled={!mounted}
      aria-label={mounted ? copy.actionLabel : "Loading appearance preference"}
      title={mounted ? copy.actionLabel : undefined}
      onClick={toggle}
      className={cn(showLabel && "gap-2", className)}
    >
      <AppearanceIcon appearance={appearance} />
      {showLabel && <span>{mounted ? copy.actionLabel : "Appearance"}</span>}
    </Button>
  );
}
