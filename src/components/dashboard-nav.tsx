"use client";

import { useCallback, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ChevronDown,
  CircleHelp,
  LogOut,
  Mail,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  UserRound,
  Users,
} from "lucide-react";
import { signOutAction } from "@/lib/actions/auth";
import { getDashboardNavigation, type ProductNavGroup, type ProductNavItem } from "@/lib/product-navigation";
import type { BillingCapability } from "@/lib/billing/entitlements";
import { cn } from "@/lib/utils";
import { useOnboardingTour } from "@/components/onboarding-tour-context";
import { AppearanceMenuItem } from "@/components/appearance-toggle";
import { VesperWiseLogo } from "@/components/vesper-wise-logo";
import { writeSidebarCollapsedCookie } from "@/lib/sidebar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact || href === "/") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Seeded from the cookie the server already read, so the first client render
 * matches the server's and the shell never flashes expanded before collapsing.
 */
function useSidebarCollapsed(defaultCollapsed: boolean) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const toggle = useCallback(() => {
    setCollapsed((previous) => {
      const next = !previous;
      writeSidebarCollapsedCookie(next);
      return next;
    });
  }, []);
  return { collapsed, toggle };
}

function NavItem({ item, collapsed, onNavigate }: {
  item: ProductNavItem;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = isActive(pathname, item.href, item.exact);
  const Icon = item.icon;

  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        // rounded-lg matches Button, which sits directly above and below these
        // items in the rail; rounded-md read as a different component.
        "flex min-h-11 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:min-h-9",
        collapsed && "justify-center px-0",
        active
          ? "bg-sidebar-accent text-sidebar-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" strokeWidth={1.8} />
      {/* The label stays in the DOM when collapsed rather than becoming an
          aria-label, so the accessible name is identical in both states and the
          tooltip is purely a visual affordance. */}
      <span className={collapsed ? "sr-only" : "truncate"}>{item.label}</span>
    </Link>
  );

  if (!collapsed) {
    return link;
  }

  return (
    <Tooltip>
      <TooltipTrigger render={link} />
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

function GroupedNavigation({ groups, collapsed, onNavigate }: {
  groups: ProductNavGroup[];
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Primary" className="flex flex-1 flex-col gap-4 overflow-y-auto">
      {groups.map((group) => (
        <div key={group.label} className="space-y-0.5">
          {!collapsed && (
            <p className="px-2.5 pb-1 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              {group.label}
            </p>
          )}
          {group.items.map((item) => (
            <NavItem key={item.href} item={item} collapsed={collapsed} onNavigate={onNavigate} />
          ))}
        </div>
      ))}
    </nav>
  );
}

interface AccountMenuProps {
  workspaceName: string;
  email: string;
  role: string;
  isAdmin: boolean;
  isPlatformAdmin: boolean;
  billingCapabilities?: readonly BillingCapability[];
  collapsed?: boolean;
}

export function AccountMenu({
  workspaceName,
  email,
  role,
  isAdmin,
  isPlatformAdmin,
  collapsed = false,
}: AccountMenuProps) {
  const { openTour } = useOnboardingTour();
  const initials = workspaceName.slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className={cn(
              "h-auto w-full justify-start gap-2 px-2 py-2",
              collapsed && "w-11 justify-center px-0",
            )}
            aria-label={`Open ${workspaceName} account menu`}
          />
        }
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/15 font-mono text-xs font-semibold text-brand-strong">
          {initials}
        </span>
        {!collapsed && (
          <span className="min-w-0 flex-1 text-left">
            <span className="block truncate text-sm font-medium">{workspaceName}</span>
            <span className="block truncate text-xs text-muted-foreground">{email}</span>
          </span>
        )}
        {!collapsed && <ChevronDown className="size-4 text-muted-foreground" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 py-2">
            <span className="block truncate text-sm font-medium text-foreground">{workspaceName}</span>
            <span className="mt-0.5 block truncate font-normal">{email} · {role}</span>
          </DropdownMenuLabel>
          <DropdownMenuItem render={<Link href="/settings/profile" />}><UserRound />Your profile</DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/settings/workspace" />}><Building2 />Workspace settings</DropdownMenuItem>
          {isAdmin && <DropdownMenuItem render={<Link href="/settings/members" />}><Users />Team members</DropdownMenuItem>}
          {isPlatformAdmin && <DropdownMenuItem render={<Link href="/platform/email" />}><Settings />Platform administration</DropdownMenuItem>}
          <DropdownMenuItem onClick={openTour}><CircleHelp />Product tour</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <AppearanceMenuItem />
        <DropdownMenuSeparator />
        <form action={signOutAction}>
          <DropdownMenuItem render={<button type="submit" className="w-full" />}><LogOut />Sign out</DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type DashboardNavigationProps = AccountMenuProps & {
  /** Read from the sidebar cookie by the server layout. */
  defaultCollapsed?: boolean;
};

export function DashboardSidebar({
  defaultCollapsed = false,
  ...props
}: DashboardNavigationProps) {
  const { collapsed, toggle } = useSidebarCollapsed(defaultCollapsed);
  const groups = getDashboardNavigation(props);

  return (
    <aside className={cn(
      // The rail's width is a layout property, but this is a single element
      // toggled deliberately, and the flex-1 content beside it tracks the change
      // frame by frame. ease-in-out-strong because it is on-screen movement.
      "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3 py-4 transition-[width] duration-200 ease-in-out-strong md:flex",
      collapsed ? "w-16 px-2" : "w-64",
    )}>
      <div className={cn("flex items-center gap-2 pb-6", collapsed && "flex-col") }>
        <VesperWiseLogo href="/" size="sm" iconOnly={collapsed} />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={toggle}
          className={cn(!collapsed && "ml-auto")}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
        </Button>
      </div>
      <TooltipProvider>
        <GroupedNavigation groups={groups} collapsed={collapsed} />
        <div className="mt-3 border-t border-sidebar-border pt-3">
          <NavItem item={{ href: "/settings", label: "Settings", icon: Settings }} collapsed={collapsed} />
        </div>
      </TooltipProvider>
      <div className="mt-3 border-t border-sidebar-border pt-3">
        <AccountMenu {...props} collapsed={collapsed} />
      </div>
    </aside>
  );
}

export function MobileNavigation(props: DashboardNavigationProps) {
  const [open, setOpen] = useState(false);
  const groups = getDashboardNavigation(props);

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur md:hidden">
      <VesperWiseLogo href="/" size="sm" />
      <div className="flex items-center gap-1">
        <AccountMenu {...props} collapsed />
        <Button variant="ghost" size="icon" className="size-11" onClick={() => setOpen(true)} aria-label="Open navigation">
          <Menu />
        </Button>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[88vw] max-w-sm gap-0 bg-sidebar p-0">
          <SheetHeader className="border-b border-sidebar-border px-4 py-5">
            <SheetTitle>VesperWise</SheetTitle>
            <SheetDescription>{props.workspaceName}</SheetDescription>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col px-3 py-4">
            <GroupedNavigation groups={groups} collapsed={false} onNavigate={() => setOpen(false)} />
            <div className="mt-3 border-t border-sidebar-border pt-3">
              <NavItem item={{ href: "/settings", label: "Settings", icon: Settings }} collapsed={false} onNavigate={() => setOpen(false)} />
            </div>
            <div className="mt-3 border-t border-sidebar-border pt-3">
              <AccountMenu {...props} />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}

function SimpleSidebar({ logoHref, label, links, footer, collapsedFooter, defaultCollapsed = false }: {
  logoHref: string;
  label: string;
  links: ProductNavItem[];
  footer?: ReactNode;
  collapsedFooter?: ReactNode;
  defaultCollapsed?: boolean;
}) {
  const { collapsed, toggle } = useSidebarCollapsed(defaultCollapsed);
  return (
    <aside className={cn("sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3 py-4 md:flex", collapsed ? "w-16 px-2" : "w-60")}>
      <div className={cn("flex items-center gap-2 pb-6", collapsed && "flex-col")}>
        <VesperWiseLogo href={logoHref} size="sm" iconOnly={collapsed} />
        {!collapsed && <span className="text-xs text-muted-foreground">{label}</span>}
        <Button variant="ghost" size="icon-sm" onClick={toggle} className={cn(!collapsed && "ml-auto")} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
        </Button>
      </div>
      <TooltipProvider>
        <GroupedNavigation groups={[{ label, items: links }]} collapsed={collapsed} />
      </TooltipProvider>
      <div className="mt-3 border-t border-sidebar-border pt-3">{collapsed ? collapsedFooter : footer}</div>
    </aside>
  );
}

function SimpleMobileNavigation({ logoHref, label, links, footer }: {
  logoHref: string;
  label: string;
  links: ProductNavItem[];
  footer?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur md:hidden">
      <VesperWiseLogo href={logoHref} size="sm" />
      <Button variant="ghost" size="icon" className="size-11" onClick={() => setOpen(true)} aria-label={`Open ${label} navigation`}><Menu /></Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[88vw] max-w-sm gap-0 bg-sidebar p-0">
          <SheetHeader className="border-b border-sidebar-border px-4 py-5"><SheetTitle>{label}</SheetTitle><SheetDescription>VesperWise</SheetDescription></SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col px-3 py-4">
            <GroupedNavigation groups={[{ label, items: links }]} collapsed={false} onNavigate={() => setOpen(false)} />
            {footer && <div className="mt-3 border-t border-sidebar-border pt-3">{footer}</div>}
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}

export function PlatformSidebar({ footer, collapsedFooter, defaultCollapsed }: { footer?: ReactNode; collapsedFooter?: ReactNode; defaultCollapsed?: boolean }) {
  const links = [{ href: "/platform/email", label: "Email", icon: Mail }];
  return <><SimpleSidebar logoHref="/pipeline" label="Platform" links={links} footer={footer} collapsedFooter={collapsedFooter} defaultCollapsed={defaultCollapsed} /><SimpleMobileNavigation logoHref="/pipeline" label="Platform" links={links} footer={footer} /></>;
}

export function PortalSidebar({ footer, collapsedFooter, defaultCollapsed }: { footer?: ReactNode; collapsedFooter?: ReactNode; defaultCollapsed?: boolean }) {
  const links = [{ href: "/portal", label: "Properties", icon: Building2, exact: true }];
  return <><SimpleSidebar logoHref="/portal" label="Client portal" links={links} footer={footer} collapsedFooter={collapsedFooter} defaultCollapsed={defaultCollapsed} /><SimpleMobileNavigation logoHref="/portal" label="Client portal" links={links} footer={footer} /></>;
}
