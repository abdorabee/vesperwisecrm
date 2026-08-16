import { VesperWiseLogo } from "@/components/vesper-wise-logo";

interface FooterLink {
  label: string;
  href: string;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: "PRODUCT",
    links: [
      { label: "Lead intake", href: "#top" },
      { label: "Skip tracing", href: "#top" },
      { label: "Dialer", href: "#top" },
      { label: "Pipeline", href: "#top" },
      { label: "Workflows", href: "#top" },
      { label: "Reporting", href: "#top" },
    ],
  },
  {
    title: "SOLUTIONS",
    links: [
      { label: "Wholesalers", href: "#top" },
      { label: "Fix and flip", href: "#top" },
      { label: "Buy and hold", href: "#top" },
      { label: "Agents", href: "#top" },
      { label: "Dispositions", href: "#top" },
    ],
  },
  {
    title: "RESOURCES",
    links: [
      { label: "Docs", href: "#top" },
      { label: "Onboarding", href: "#top" },
      { label: "Changelog", href: "#top" },
      { label: "Integrations", href: "#top" },
      { label: "Support", href: "#top" },
    ],
  },
  {
    title: "COMPANY",
    links: [
      { label: "About", href: "#top" },
      { label: "Careers", href: "#top" },
      { label: "Security", href: "#top" },
      { label: "Contact", href: "#top" },
    ],
  },
];

const LEGAL_LINKS: FooterLink[] = [
  { label: "PRIVACY", href: "#top" },
  { label: "TERMS", href: "#top" },
  { label: "STATUS", href: "#top" },
];

export function MarketingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mkt-surface border-t border-[color:var(--mkt-border-subtle)] text-[var(--mkt-text)]">
      <div className="mx-auto max-w-[1240px] px-4 py-14 sm:px-7 lg:py-18">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-5">
          <div className="space-y-4">
            <VesperWiseLogo size="sm" href="/home" />
            <p className="max-w-xs font-sans text-sm leading-6 text-[var(--mkt-text2)]">
              The acquisition system for real estate teams. Built for the follow-up.
            </p>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <nav
              key={column.title}
              className="flex flex-col gap-3"
              aria-label={column.title}
            >
              <h2 className="font-mono text-[10px] tracking-[0.09em] text-[var(--mkt-text3)] uppercase">
                {column.title}
              </h2>
              <ul className="flex flex-col gap-2.5">
                {column.links.map((link) => (
                  <li key={`${column.title}-${link.label}`}>
                    <a
                      href={link.href}
                      className="text-sm text-[var(--mkt-text2)] transition-colors duration-150 hover:text-[var(--mkt-text)]"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-[color:var(--mkt-border-subtle)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[10px] tracking-[0.09em] text-[var(--mkt-text3)] uppercase">
            © {currentYear} VESPERWISE. ALL RIGHTS RESERVED.
          </p>
          <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Legal">
            {LEGAL_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="font-mono text-[10px] tracking-[0.09em] text-[var(--mkt-text3)] uppercase transition-colors duration-150 hover:text-[var(--mkt-text)]"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
