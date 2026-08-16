# Shared Layouts

## Root layout

- Source: `src/app/layout.tsx`
- Global font, appearance, toaster, service-worker, metadata, and body shell.

```tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { AppearanceProvider } from "@/components/appearance-provider";
import { LIGHT_THEME_COLOR } from "@/lib/appearance";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "VesperWise CRM", template: "%s · VesperWise CRM" },
  description: "An acquisition CRM for intake, qualification, outreach, routing, and team performance.",
  icons: {
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Vesperwise",
  },
};

export const viewport: Viewport = {
  themeColor: LIGHT_THEME_COLOR,
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppearanceProvider>
          {children}
          <Toaster />
          <ServiceWorkerRegistration />
        </AppearanceProvider>
      </body>
    </html>
  );
}
```
## Marketing layout

- Source: `src/app/(marketing)/layout.tsx`
- Dark public marketing shell with fixed marketing navigation and footer.

```tsx
import type { ReactNode } from "react";

import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import "@/components/marketing/marketing.css";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="dark flex min-h-screen flex-col bg-background text-foreground"
      data-theme-surface="marketing"
    >
      <MarketingNav />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
```

## Marketing navigation

- Source: `src/components/marketing/marketing-nav.tsx`
- Fixed public navigation with VesperWise wordmark, section links, sign-in, and get-started CTA.

```tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { VesperWiseLogo } from "@/components/vesper-wise-logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Product", href: "#product" },
  { label: "AI", href: "#ai" },
  { label: "Pricing", href: "#pricing" },
];

const SCROLL_THRESHOLD_PX = 8;

export function MarketingNav() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > SCROLL_THRESHOLD_PX);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-200",
        isScrolled
          ? "border-b border-border bg-background/70 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <nav
        className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6"
        aria-label="Main"
      >
        <VesperWiseLogo size="sm" href="/home" />

        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            render={<Link href="/login" />}
            nativeButton={false}
            className="hidden sm:inline-flex"
          >
            Sign in
          </Button>
          <Button render={<Link href="/login" />} nativeButton={false}>
            Get started
          </Button>
        </div>
      </nav>
    </header>
  );
}
```

## Marketing footer

- Source: `src/components/marketing/marketing-footer.tsx`
- Public footer with wordmark, product description, section links, and copyright.

```tsx
import Link from "next/link";

import { VesperWiseLogo } from "@/components/vesper-wise-logo";

const FOOTER_LINKS = [
  { label: "Product", href: "#product" },
  { label: "AI", href: "#ai" },
  { label: "Pricing", href: "#pricing" },
  { label: "Sign in", href: "/login" },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="flex flex-col gap-2">
            <VesperWiseLogo size="sm" href="/home" />
            <p className="max-w-xs text-sm text-muted-foreground">
              The acquisition-pipeline CRM: lead intake, qualification, and
              follow-up from any device.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Footer">
            {FOOTER_LINKS.map((link) =>
              link.href.startsWith("#") ? (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
                >
                  {link.label}
                </Link>
              ),
            )}
          </nav>
        </div>
        <div className="divider-quiet border-t pt-6">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} VesperWise. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
```

## VesperWise logo

- Source: `src/components/vesper-wise-logo.tsx`
- Reusable VESPER / acid-lime WISE wordmark.

```tsx
import Link from "next/link";
import { cn } from "@/lib/utils";

const sizeStyles = {
  sm: {
    word: "text-[13px] sm:text-sm",
    block: "h-7 w-7 sm:h-8 sm:w-8 text-[11px] sm:text-xs px-1",
  },
  md: {
    word: "text-lg sm:text-xl",
    block: "h-10 w-10 sm:h-12 sm:w-12 text-sm sm:text-base px-1.5",
  },
} as const;

interface VesperWiseLogoProps {
  size?: keyof typeof sizeStyles;
  href?: string;
  className?: string;
  iconOnly?: boolean;
}

function Wordmark({
  size = "sm",
  className,
  iconOnly,
}: {
  size?: keyof typeof sizeStyles;
  className?: string;
  iconOnly?: boolean;
}) {
  const styles = sizeStyles[size];

  return (
    <span
      className={cn(
        "inline-flex items-stretch leading-none select-none",
        className,
      )}
      aria-hidden
    >
      {!iconOnly && (
        <span
          className={cn(
            "self-center font-bold uppercase tracking-tight text-foreground",
            styles.word,
          )}
        >
          VESPER
        </span>
      )}
      <span
        className={cn(
          "inline-flex items-center justify-center bg-primary font-bold uppercase tracking-tight text-primary-foreground",
          styles.block,
          styles.word,
        )}
      >
        {iconOnly ? "W" : "WISE."}
      </span>
    </span>
  );
}

export function VesperWiseLogo({
  size = "sm",
  href,
  className,
  iconOnly,
}: VesperWiseLogoProps) {
  if (href) {
    return (
      <Link
        href={href}
        aria-label="Vesper Wise home"
        className={cn(
          "inline-flex min-h-11 shrink-0 items-center py-1 transition-opacity duration-200 hover:opacity-90",
          className,
        )}
      >
        <Wordmark size={size} iconOnly={iconOnly} />
      </Link>
    );
  }

  return (
    <span
      className={cn("inline-flex items-center", className)}
      role="img"
      aria-label="Vesper Wise"
    >
      <Wordmark size={size} iconOnly={iconOnly} />
    </span>
  );
}
```

## Dashboard layout

- Source: `src/app/(dashboard)/layout.tsx`
- Authenticated desktop sidebar/mobile shell with account data providers and dialer runtime.

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership, isAdminRole } from "@/lib/queries/members";
import { isPlatformAdminEmail } from "@/lib/supabase/platform-admin";
import { DashboardSidebar, MobileNavigation } from "@/components/dashboard-nav";
import { OnboardingTourProvider } from "@/components/onboarding-tour-context";
import { OnboardingTour } from "./_components/onboarding-tour";
import { getDialerShellData } from "@/lib/queries/dialer";
import { getDialerCredentialStatus } from "@/lib/queries/dialer-credentials";
import { DialerSessionProvider, type ActiveDialerSession } from "@/components/dialer/dialer-session-provider";
import { ActiveCallPanel } from "@/components/dialer/active-call-panel";
import { isDialerEnabled } from "@/lib/dialer/config";
import { getWorkspaceSettings } from "@/lib/queries/workspace-settings";
import { WorkspaceFormattingProvider } from "@/components/workspace-formatting-context";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const membership = await getCurrentMembership();

  if (membership?.role === "client") {
    redirect("/portal");
  }

  const isAdmin = membership ? isAdminRole(membership.role) : false;
  const isPlatformAdmin = isPlatformAdminEmail(user.email);
  const workspace = await getWorkspaceSettings();
  const dialerShell = isDialerEnabled()
    ? await getDialerShellData()
    : { active: null, dispositions: [] };
  const twilioCredentialStatus = isDialerEnabled()
    ? await getDialerCredentialStatus()
    : { connected: false, accountSid: null, fromNumber: null, status: null, lastVerifiedAt: null };
  const twilioConnected = twilioCredentialStatus.connected && twilioCredentialStatus.status === "active";
  const activeAttempt = dialerShell.active?.attempts.find((attempt) =>
    ["queued", "initiating", "ringing", "answered"].includes(attempt.status),
  );
  const initialSession: ActiveDialerSession | null = dialerShell.active && activeAttempt
    ? {
        callId: dialerShell.active.id,
        attemptId: activeAttempt.id,
        contactId: dialerShell.active.contact.id,
        contactName: [dialerShell.active.contact.first_name, dialerShell.active.contact.last_name].filter(Boolean).join(" "),
        leadId: dialerShell.active.lead?.id ?? null,
        leadTitle: dialerShell.active.lead?.title ?? null,
        status: dialerShell.active.status as ActiveDialerSession["status"],
        startedAt: dialerShell.active.started_at ?? dialerShell.active.created_at,
        error: dialerShell.active.failure_reason,
        recoverable: false,
      }
    : null;

  return (
    <DialerSessionProvider initialSession={initialSession} enabled={isDialerEnabled()} twilioConnected={twilioConnected}>
      <OnboardingTourProvider>
        <WorkspaceFormattingProvider settings={workspace}>
        <a href="#main-content" className="sr-only z-[100] rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
          Skip to content
        </a>
        <div className="flex min-h-dvh">
          <DashboardSidebar
            workspaceName={workspace.name}
            email={user.email ?? "Signed-in member"}
            role={membership?.role ?? "member"}
            isAdmin={isAdmin}
            isPlatformAdmin={isPlatformAdmin}
          />
          <div className="min-w-0 flex-1">
            <MobileNavigation
              workspaceName={workspace.name}
              email={user.email ?? "Signed-in member"}
              role={membership?.role ?? "member"}
              isAdmin={isAdmin}
              isPlatformAdmin={isPlatformAdmin}
            />
            <main id="main-content" tabIndex={-1} className="min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
          </div>
          <OnboardingTour isAdmin={isAdmin} />
          <ActiveCallPanel dispositions={dialerShell.dispositions} />
        </div>
        </WorkspaceFormattingProvider>
      </OnboardingTourProvider>
    </DialerSessionProvider>
  );
}
```

## Dashboard navigation

- Source: `src/components/dashboard-nav.tsx`
- Responsive product navigation, workspace identity, onboarding trigger, appearance control, and sign-out.

```tsx
"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
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
import { cn } from "@/lib/utils";
import { useOnboardingTour } from "@/components/onboarding-tour-context";
import { AppearanceMenuItem } from "@/components/appearance-toggle";
import { VesperWiseLogo } from "@/components/vesper-wise-logo";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const COLLAPSE_STORAGE_KEY = "sidebar-collapsed";
const COLLAPSE_EVENT = "vesperwise:sidebar-collapse";

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact || href === "/") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function subscribeToSidebar(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(COLLAPSE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(COLLAPSE_EVENT, callback);
  };
}

function getSidebarSnapshot(): boolean {
  return window.localStorage.getItem(COLLAPSE_STORAGE_KEY) === "1";
}

function useSidebarCollapsed() {
  const collapsed = useSyncExternalStore(subscribeToSidebar, getSidebarSnapshot, () => false);
  function toggle() {
    window.localStorage.setItem(COLLAPSE_STORAGE_KEY, collapsed ? "0" : "1");
    window.dispatchEvent(new Event(COLLAPSE_EVENT));
  }
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

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      aria-label={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:min-h-9",
        collapsed && "justify-center px-0",
        active
          ? "bg-sidebar-accent text-sidebar-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" strokeWidth={1.8} />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
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
            <p className="px-2.5 pb-1 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground/75 uppercase">
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

type DashboardNavigationProps = AccountMenuProps;

export function DashboardSidebar(props: DashboardNavigationProps) {
  const { collapsed, toggle } = useSidebarCollapsed();
  const groups = getDashboardNavigation(props);

  return (
    <aside className={cn(
      "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3 py-4 transition-[width] duration-200 md:flex",
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
      <GroupedNavigation groups={groups} collapsed={collapsed} />
      <div className="mt-3 border-t border-sidebar-border pt-3">
        <NavItem item={{ href: "/settings", label: "Settings", icon: Settings }} collapsed={collapsed} />
      </div>
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

function SimpleSidebar({ logoHref, label, links, footer, collapsedFooter }: {
  logoHref: string;
  label: string;
  links: ProductNavItem[];
  footer?: ReactNode;
  collapsedFooter?: ReactNode;
}) {
  const { collapsed, toggle } = useSidebarCollapsed();
  return (
    <aside className={cn("sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3 py-4 md:flex", collapsed ? "w-16 px-2" : "w-60")}>
      <div className={cn("flex items-center gap-2 pb-6", collapsed && "flex-col")}>
        <VesperWiseLogo href={logoHref} size="sm" iconOnly={collapsed} />
        {!collapsed && <span className="text-xs text-muted-foreground">{label}</span>}
        <Button variant="ghost" size="icon-sm" onClick={toggle} className={cn(!collapsed && "ml-auto")} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
        </Button>
      </div>
      <GroupedNavigation groups={[{ label, items: links }]} collapsed={collapsed} />
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

export function PlatformSidebar({ footer, collapsedFooter }: { footer?: ReactNode; collapsedFooter?: ReactNode }) {
  const links = [{ href: "/platform/email", label: "Email", icon: Mail }];
  return <><SimpleSidebar logoHref="/pipeline" label="Platform" links={links} footer={footer} collapsedFooter={collapsedFooter} /><SimpleMobileNavigation logoHref="/pipeline" label="Platform" links={links} footer={footer} /></>;
}

export function PortalSidebar({ footer, collapsedFooter }: { footer?: ReactNode; collapsedFooter?: ReactNode }) {
  const links = [{ href: "/portal", label: "Properties", icon: Building2, exact: true }];
  return <><SimpleSidebar logoHref="/portal" label="Client portal" links={links} footer={footer} collapsedFooter={collapsedFooter} /><SimpleMobileNavigation logoHref="/portal" label="Client portal" links={links} footer={footer} /></>;
}
```

## Settings layout

- Source: `src/app/(dashboard)/settings/layout.tsx`
- Settings-specific navigation wrapper.

```tsx
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getCurrentMembership, isAdminRole } from "@/lib/queries/members";
import { SettingsNavigation } from "@/components/settings/settings-navigation";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const membership = await getCurrentMembership();
  const isAdmin = membership ? isAdminRole(membership.role) : false;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-5 flex items-center gap-1.5 text-xs text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <ChevronRight className="size-3" aria-hidden="true" />
        <span aria-current="page">Settings</span>
      </div>
      <div className="grid gap-7 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12">
        <SettingsNavigation isAdmin={isAdmin} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
```

## Portal layout

- Source: `src/app/(portal)/layout.tsx`
- Client portal authentication and content shell.

```tsx
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/queries/members";
import { signOutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { PortalSidebar } from "@/components/dashboard-nav";
import { getWorkspaceSettings } from "@/lib/queries/workspace-settings";
import { WorkspaceFormattingProvider } from "@/components/workspace-formatting-context";
import { AppearanceToggleButton } from "@/components/appearance-toggle";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const membership = await getCurrentMembership();

  if (membership?.role !== "client") {
    redirect("/");
  }
  const workspace = await getWorkspaceSettings();

  return (
    <WorkspaceFormattingProvider settings={workspace}>
    <a href="#portal-main-content" className="sr-only z-[100] rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
    <div className="flex min-h-dvh flex-col md:flex-row">
      <PortalSidebar
        footer={
          <div className="flex flex-col gap-2 px-1.5">
            <span className="truncate text-xs text-muted-foreground">
              {user.email}
            </span>
            <AppearanceToggleButton showLabel className="w-full justify-start px-1.5" />
            <form action={signOutAction}>
              <Button
                variant="ghost"
                size="sm"
                type="submit"
                className="w-full justify-start px-1.5"
              >
                Sign out
              </Button>
            </form>
          </div>
        }
        collapsedFooter={
          <div className="flex flex-col items-center gap-1">
            <AppearanceToggleButton />
            <form action={signOutAction} className="flex justify-center">
              <Button
                variant="ghost"
                size="icon-sm"
                type="submit"
                title="Sign out"
              >
                <LogOut className="size-4" />
              </Button>
            </form>
          </div>
        }
      />
      <main id="portal-main-content" tabIndex={-1} className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
    </div>
    </WorkspaceFormattingProvider>
  );
}
```
