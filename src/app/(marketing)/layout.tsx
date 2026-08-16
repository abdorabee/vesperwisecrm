import type { ReactNode } from "react";

import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import "@/components/marketing/marketing.css";
import "@/components/marketing/marketing-theme.css";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex min-h-screen min-w-0 flex-col bg-background text-foreground"
      data-theme-surface="marketing"
    >
      <MarketingNav />
      <main className="min-w-0 flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
