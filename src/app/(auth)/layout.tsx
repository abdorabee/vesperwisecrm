import type { ReactNode } from "react";
import Link from "next/link";

import { MarketingThemeToggle } from "@/components/marketing/marketing-theme-toggle";
import { VesperWiseLogo } from "@/components/vesper-wise-logo";
import "@/components/marketing/marketing-theme.css";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative flex min-h-dvh min-w-0 flex-col overflow-hidden bg-[var(--mkt-bg)] text-[var(--mkt-text)]"
      data-theme-surface="auth"
    >
      <a
        href="#auth-main-content"
        className="sr-only z-50 rounded-md bg-[var(--mkt-accent)] px-3 py-2 text-[var(--mkt-accent-ink)] focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to authentication form
      </a>
      <div className="mkt-grid-bg pointer-events-none absolute inset-0" aria-hidden />

      <header className="relative z-10 mx-auto flex w-full max-w-[1240px] flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-7 sm:py-5">
        <VesperWiseLogo href="/home" size="sm" />
        <nav
          aria-label="Authentication"
          className="flex min-w-0 flex-wrap items-center justify-end gap-2"
        >
          <Link
            href="/home"
            className="rounded-md px-2.5 py-2 font-mono text-[11px] font-medium tracking-[0.06em] text-[var(--mkt-text2)] uppercase transition-colors hover:bg-[var(--mkt-bg2)] hover:text-[var(--mkt-text)]"
          >
            Back to home
          </Link>
          <MarketingThemeToggle />
        </nav>
      </header>

      {children}
    </div>
  );
}
