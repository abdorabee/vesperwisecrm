"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { CompactSettingsNavigation } from "@/components/settings/compact-settings-navigation";
import {
  getCurrentSettingsLocation,
  getSettingsNavigationGroups,
  isSettingsPathActive,
} from "@/components/settings/settings-navigation-model";
import { cn } from "@/lib/utils";

export function SettingsNavigation({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const groups = getSettingsNavigationGroups(isAdmin);
  const current = getCurrentSettingsLocation(pathname, groups);

  function navigate(event: MouseEvent<HTMLElement>, href: string): boolean {
    event.preventDefault();
    if (href === current.href) return true;
    const hasUnsavedSettings = document.documentElement.dataset.unsavedSettings === "true";
    if (hasUnsavedSettings && !window.confirm("You have unsaved settings. Leave without saving?")) {
      return false;
    }
    router.push(href);
    return true;
  }

  return (
    <>
      <CompactSettingsNavigation
        current={current}
        groups={groups}
        pathname={pathname}
        onNavigate={navigate}
      />
      <nav aria-label="Settings" className="sticky top-8 hidden self-start lg:block">
        <p className="mb-5 text-lg font-semibold">Settings</p>
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="mb-1 px-2 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={(event) => navigate(event, item.href)}
                    aria-current={isSettingsPathActive(pathname, item.href) ? "page" : undefined}
                    className={cn(
                      "block rounded-md px-2 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      isSettingsPathActive(pathname, item.href) ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>
    </>
  );
}
