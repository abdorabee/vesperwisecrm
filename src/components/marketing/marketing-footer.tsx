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
