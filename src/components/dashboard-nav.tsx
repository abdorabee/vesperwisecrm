"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { VesperWiseLogo } from "@/components/vesper-wise-logo";

interface NavLink {
  href: string;
  label: string;
  exact?: boolean;
}

interface DashboardNavProps {
  links: NavLink[];
}

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact || href === "/") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavItem({ href, label, exact }: NavLink) {
  const pathname = usePathname();
  const active = isActive(pathname, href, exact);

  return (
    <Link
      href={href}
      className={cn(
        "shrink-0 rounded-md px-2 py-1.5 transition-colors duration-200",
        active
          ? "bg-accent/50 text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}

export function DashboardNav({ links }: DashboardNavProps) {
  return (
    <nav className="flex min-w-0 flex-1 items-center gap-3 text-sm font-medium">
      <VesperWiseLogo href="/" size="sm" />
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {links.map((link) => (
          <NavItem key={link.href} {...link} />
        ))}
      </div>
    </nav>
  );
}

interface PlatformNavProps {
  links: NavLink[];
}

export function PlatformNav({ links }: PlatformNavProps) {
  return (
    <nav className="flex min-w-0 flex-1 items-center gap-3 text-sm font-medium">
      <div className="flex shrink-0 items-center gap-2">
        <VesperWiseLogo href="/pipeline" size="sm" />
        <span className="text-xs text-muted-foreground">Platform</span>
      </div>
      <div className="flex items-center gap-1">
        {links.map((link) => (
          <NavItem key={link.href} {...link} />
        ))}
      </div>
    </nav>
  );
}
