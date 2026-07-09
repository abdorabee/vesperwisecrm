"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  Briefcase,
  ClipboardCheck,
  FileText,
  FolderKanban,
  Kanban,
  Mail,
  PanelLeftClose,
  PanelLeftOpen,
  PhoneCall,
  Trophy,
  User,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VesperWiseLogo } from "@/components/vesper-wise-logo";

const COLLAPSE_STORAGE_KEY = "sidebar-collapsed";

interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact || href === "/") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavItem({
  href,
  label,
  icon: Icon,
  exact,
  collapsed,
}: NavLink & { collapsed: boolean }) {
  const pathname = usePathname();
  const active = isActive(pathname, href, exact);

  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors duration-150",
        collapsed && "justify-center px-0",
        active
          ? "bg-sidebar-accent text-sidebar-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(COLLAPSE_STORAGE_KEY) === "1");
    setHydrated(true);
  }, []);

  function toggle() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return { collapsed: hydrated && collapsed, toggle };
}

function SidebarShell({
  links,
  logoHref = "/",
  label,
  footer,
  collapsedFooter,
}: {
  links: NavLink[];
  logoHref?: string;
  label?: string;
  footer?: ReactNode;
  collapsedFooter?: ReactNode;
}) {
  const { collapsed, toggle } = useSidebarCollapsed();
  const activeFooter = collapsed ? (collapsedFooter ?? footer) : footer;

  return (
    <aside
      className={cn(
        "flex h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar py-4 transition-[width] duration-200",
        collapsed ? "w-16 px-2" : "w-60 px-3",
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center gap-2 pb-5",
          collapsed ? "flex-col gap-3 px-0" : "px-1.5",
        )}
      >
        <VesperWiseLogo href={logoHref} size="sm" iconOnly={collapsed} />
        {label && !collapsed && (
          <span className="text-xs font-medium text-muted-foreground">
            {label}
          </span>
        )}
        <button
          type="button"
          onClick={toggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            !collapsed && "ml-auto",
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </button>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {links.map((link) => (
          <NavItem key={link.href} {...link} collapsed={collapsed} />
        ))}
      </nav>
      {activeFooter && (
        <div className="mt-2 shrink-0 border-t border-sidebar-border pt-3">
          {activeFooter}
        </div>
      )}
    </aside>
  );
}

interface DashboardSidebarProps {
  isAdmin: boolean;
  isPlatformAdmin: boolean;
  footer?: ReactNode;
  collapsedFooter?: ReactNode;
}

export function DashboardSidebar({
  isAdmin,
  isPlatformAdmin,
  footer,
  collapsedFooter,
}: DashboardSidebarProps) {
  const links: NavLink[] = [
    { href: "/pipeline", label: "Pipeline", icon: Kanban },
    { href: "/intake", label: "Submit Lead", icon: PhoneCall },
    { href: "/queue", label: "Lead Queue", icon: ClipboardCheck },
    { href: "/sequences", label: "Sequences", icon: Workflow },
    { href: "/workflows", label: "Workflows", icon: FolderKanban },
    { href: "/scorecard", label: "My Scorecard", icon: Trophy },
    { href: "/settings/profile", label: "Profile", icon: User },
    ...(isAdmin
      ? [
          { href: "/team", label: "Team", icon: Users, exact: true },
          { href: "/settings/email", label: "Email", icon: Mail },
          { href: "/settings/google", label: "Google", icon: FileText },
          { href: "/team/groups", label: "Groups", icon: FolderKanban },
          { href: "/team/clients", label: "Clients", icon: Briefcase },
          {
            href: "/team/scorecard",
            label: "Employee Scorecard",
            icon: Award,
          },
        ]
      : []),
    ...(isPlatformAdmin
      ? [{ href: "/platform/email", label: "Platform", icon: Mail }]
      : []),
  ];

  return (
    <SidebarShell
      links={links}
      footer={footer}
      collapsedFooter={collapsedFooter}
    />
  );
}

interface PlatformSidebarProps {
  footer?: ReactNode;
  collapsedFooter?: ReactNode;
}

export function PlatformSidebar({
  footer,
  collapsedFooter,
}: PlatformSidebarProps) {
  return (
    <SidebarShell
      logoHref="/pipeline"
      label="Platform"
      links={[{ href: "/platform/email", label: "Email", icon: Mail }]}
      footer={footer}
      collapsedFooter={collapsedFooter}
    />
  );
}

interface PortalSidebarProps {
  footer?: ReactNode;
  collapsedFooter?: ReactNode;
}

export function PortalSidebar({ footer, collapsedFooter }: PortalSidebarProps) {
  return (
    <SidebarShell
      logoHref="/portal"
      label="Client Portal"
      links={[{ href: "/portal", label: "Properties", icon: Briefcase, exact: true }]}
      footer={footer}
      collapsedFooter={collapsedFooter}
    />
  );
}
