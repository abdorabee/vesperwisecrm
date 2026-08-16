import Link from "next/link";

import { ContactForm } from "@/components/marketing/contact-form";
import type { MarketingPageContent } from "@/components/marketing/content/pages";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";

export function MarketingContentPage({ page }: { page: MarketingPageContent }) {
  return (
    <MarketingPageShell
      eyebrow={page.eyebrow}
      title={page.title}
      description={page.description}
      cta={page.form === "contact" ? undefined : page.cta}
    >
      {page.sections.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {page.sections.map((section) => (
            <article
              key={section.heading}
              className="rounded-[14px] border border-[color:var(--mkt-border)] bg-[var(--mkt-surface)] p-6 sm:p-8"
            >
              <h2 className="font-sans text-lg text-[var(--mkt-text)]">
                {section.heading}
              </h2>
              <p className="mt-3 font-sans text-[15px] leading-[1.55] font-light text-[var(--mkt-text2)]">
                {section.body}
              </p>
            </article>
          ))}
        </div>
      ) : null}
      {page.form === "contact" ? (
        <div className={page.sections.length > 0 ? "mt-10" : undefined}>
          <ContactForm />
          {page.cta ? (
            <div className="mt-6">
              <Link
                href={page.cta.href}
                className="font-sans text-sm text-[var(--mkt-text2)] underline decoration-[color:var(--mkt-border-strong)] underline-offset-4 transition-colors hover:text-[var(--mkt-text)] hover:decoration-[color:var(--mkt-accent)]"
              >
                {page.cta.label}
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </MarketingPageShell>
  );
}
