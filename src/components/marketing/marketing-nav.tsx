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
