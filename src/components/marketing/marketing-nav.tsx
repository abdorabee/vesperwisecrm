"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { VesperWiseLogo } from "@/components/vesper-wise-logo";
import { MarketingThemeToggle } from "@/components/marketing/marketing-theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MarketingNavLink {
  label: string;
  href: string;
}

const NAV_LINKS: MarketingNavLink[] = [
  { label: "Product", href: "/home#ch1" },
  { label: "Automation", href: "/home#ch5" },
  { label: "Teams", href: "/home#proof" },
  { label: "Pricing", href: "/home#pricing" },
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
          ? "border-b border-[color:var(--mkt-border-subtle)] bg-[var(--mkt-bg)] backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <nav
        className="mx-auto flex h-16 max-w-[1240px] items-center justify-between px-4 sm:px-7"
        aria-label="Main"
      >
        <VesperWiseLogo size="sm" href="/home" />

        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm text-[var(--mkt-text2)] transition-colors duration-150 hover:bg-[var(--mkt-bg2)] hover:text-[var(--mkt-text)]"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <MarketingThemeToggle className="hidden md:inline-flex" />
          <Button
            variant="ghost"
            render={<Link href="/login" />}
            nativeButton={false}
            className="hidden rounded-md text-[var(--mkt-text2)] hover:bg-[var(--mkt-bg2)] hover:text-[var(--mkt-text)] sm:inline-flex"
          >
            Log in
          </Button>
          <Button
            render={<Link href="/book-demo" />}
            nativeButton={false}
            className="rounded-md border-[color:var(--mkt-accent)] bg-[var(--mkt-accent)] text-[var(--mkt-accent-ink)] hover:bg-[var(--mkt-accent-hover)]"
          >
            Book a demo
          </Button>
        </div>
      </nav>
    </header>
  );
}
