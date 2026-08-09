"use client";

import { Fragment, useState, type MouseEvent } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  isSettingsPathActive,
  type SettingsNavigationGroup,
  type SettingsNavigationItem,
} from "@/components/settings/settings-navigation-model";

interface CompactSettingsNavigationProps {
  current: SettingsNavigationItem & { groupLabel: string };
  groups: SettingsNavigationGroup[];
  pathname: string;
  onNavigate: (event: MouseEvent<HTMLElement>, href: string) => boolean;
}

export function CompactSettingsNavigation({
  current,
  groups,
  pathname,
  onNavigate,
}: CompactSettingsNavigationProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <p className="mb-2 text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
        Settings
      </p>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              className="h-auto min-h-11 w-full justify-between px-3 py-2 text-left font-normal"
              aria-label={`Open settings navigation. Current page: ${current.groupLabel}, ${current.label}`}
            />
          }
        >
          <span className="min-w-0">
            <span className="block text-xs text-muted-foreground">{current.groupLabel}</span>
            <span className="block text-sm font-medium text-foreground">{current.label}</span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={6}
          className="max-h-[min(28rem,var(--available-height))]"
        >
          {groups.map((group, groupIndex) => (
            <Fragment key={group.label}>
              {groupIndex > 0 && <DropdownMenuSeparator />}
              <DropdownMenuGroup>
                <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
                {group.items.map((item) => {
                  const itemActive = isSettingsPathActive(pathname, item.href);
                  return (
                    <DropdownMenuItem
                      key={item.href}
                      aria-current={itemActive ? "page" : undefined}
                      className="min-h-10 px-2"
                      onClick={(event) => {
                        if (onNavigate(event, item.href)) setOpen(false);
                      }}
                    >
                      <span className="flex-1 whitespace-normal">{item.label}</span>
                      {itemActive && <Check className="size-4" aria-hidden="true" />}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuGroup>
            </Fragment>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
