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
