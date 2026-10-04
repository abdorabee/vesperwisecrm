import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const ROOT = process.cwd();

function source(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function expectNoLegacyMarketingTokens(fileSource: string) {
  expect(fileSource).not.toMatch(
    /--background|--foreground|--primary|--hot|--warm|--cold|bg-card|text-muted-foreground|SectionHeading|DEMO_/,
  );
}

describe("final marketing landing sections", () => {
  test("builds the approved comparison section from the five before/after pairs", () => {
    const comparisonPath = join(
      ROOT,
      "src/components/marketing/sections/comparison.tsx",
    );

    expect(existsSync(comparisonPath), "comparison section should exist").toBe(
      true,
    );

    const section = readFileSync(comparisonPath, "utf8");
    const sectionText = normalizeWhitespace(section);

    expect(section).toContain("export function Comparison()");
    expect(section).toContain("7.0");
    expect(section).toContain("WHAT IT REPLACES");
    expect(section).toContain("One system instead of six tabs.");
    expect(sectionText).toContain(
      normalizeWhitespace(
        "Teams arrive at VesperWiseCRM from spreadsheets and generic CRMs where follow-up dies in the gaps. Pipeline, email sequences, and the lead queue live on one platform.",
      ),
    );
    expect(section).toContain("Leads in a shared spreadsheet");
    expect(section).toContain("One queue with clear stages and assignments");
    expect(section).toContain("Contact info scattered across tools");
    expect(section).toContain("All contact history on one record");
    expect(section).toContain("Manual email follow-up tracking");
    expect(section).toContain("Automated email sequences with tracking");
    expect(section).toContain("Pipeline buried in spreadsheet tabs");
    expect(section).toContain("Visual pipeline with drag-and-drop stages");
    expect(section).toContain("Follow-up depends on who remembers");
    expect(section).toContain("Sequences and workflows own the follow-up");
    expect(section.toLowerCase()).not.toContain("skip tracing");
    expectNoLegacyMarketingTokens(section);
  });

  test("states early access without invented customer quotes", () => {
    const section = source("src/components/marketing/sections/testimonials.tsx");

    expect(section).toContain("8.0");
    expect(section).toContain("EARLY ACCESS");
    expect(section).toContain("Team for 60 days. No card.");
    expect(section).toContain(
      "VesperWiseCRM is in early access. Pipeline management, email sequences, and the lead queue are live.",
    );
    expect(section).not.toContain("PLACEHOLDER ·");
    expectNoLegacyMarketingTokens(section);
  });

  test("keeps the approved pricing tiers and footnote", () => {
    const section = source(
      "src/components/marketing/sections/pricing-preview.tsx",
    );
    const sectionText = normalizeWhitespace(section);

    expect(section).toContain('id="pricing"');
    expect(section).toContain("9.0");
    expect(section).toContain("PRICING");
    expect(section).toContain("Per seat. Monthly.");
    expect(section).toContain("Dialer");
    expect(section).toContain('"AI"');
    expect(section).toContain("Workflows and routing");
    expect(section).toContain("Unlimited leads");
    expect(section).not.toContain("Team roles & permissions");
    expect(section).not.toContain("Advanced pipeline views");
    expect(section).not.toContain("SSO and audit log");
    expect(section).not.toContain("Multi-market reporting");
    expect(section).not.toContain("API and data warehouse sync");
    expect(section).not.toContain("Dedicated onboarding");
    expect(section).toContain("Starter");
    expect(section).toContain("$99");
    expect(section).toContain("/ SEAT / MO");
    expect(section).toContain(
      "For solo investors and two-person teams getting off spreadsheets.",
    );
    expect(section).toContain("Team");
    expect(section).toContain("$179");
    expect(section).toContain("MOST COMMON");
    expect(sectionText).toContain(
      "For acquisition teams running paid channels and cold lists side by side.",
    );
    expect(section).toContain("Scale");
    expect(section).toContain("Custom");
    expect(section).toContain("CUSTOM");
    expect(section).not.toContain("ANNUAL");
    expect(sectionText).toContain("Talk to sales. Checkout is not available.");
    expect(section).toContain("Start free trial");
    expect(section).toContain('href: "/signup"');
    expect(section).not.toContain("Start pilot");
    expect(section).not.toContain('href: "/book-demo"');
    expect(section).toContain("Talk to sales");
    expect(section).toContain('href: "/contact"');
    expect(section).toContain("PUBLIC_SEAT_OFFER");
    expect(section).toContain("PUBLIC_BILLING_CADENCE");
    expect(section).not.toContain("Annual billing available");
    expect(section).not.toContain("Everything included");
    expectNoLegacyMarketingTokens(section);
  });

  test("keeps the approved final CTA copy, links, badges, and grid background", () => {
    const section = source("src/components/marketing/sections/final-cta.tsx");

    expect(section).toContain('id="cta"');
    expect(section).toContain("mkt-grid-bg");
    expect(section).toContain("10.0");
    expect(section).toContain("GET STARTED");
    expect(section).toContain("Work every lead like it");
    expect(section).toContain("Book a demo");
    expect(section).toContain('href="/book-demo"');
    expect(section).toContain("See pricing");
    expect(section).toContain('href="#pricing"');
    expect(section).toContain("60-DAY TEAM TRIAL");
    expect(section).not.toContain("14-DAY PILOT");
    expect(section).toContain("DATA MIGRATION INCLUDED");
    expect(section).toContain("NO ANNUAL LOCK-IN");
    expectNoLegacyMarketingTokens(section);
  });
});

describe("marketing home page section order", () => {
  test("renders all thirteen redesigned sections in approved order", () => {
    const page = source("src/app/(marketing)/home/page.tsx");
    const expectedOrder = [
      "<Hero />",
      "<ProofStrip />",
      "<Premise />",
      "<Intake />",
      "<Qualify />",
      "<Engage />",
      "<Pipeline />",
      "<Automate />",
      "<Understand />",
      "<Comparison />",
      "<Testimonials />",
      "<PricingPreview />",
      "<FinalCta />",
    ];

    let lastIndex = -1;
    for (const marker of expectedOrder) {
      const index = page.indexOf(marker);
      expect(index, `${marker} should be rendered`).toBeGreaterThan(lastIndex);
      lastIndex = index;
    }

    expect(page).toContain(
      "VesperWise CRM — Every Lead Worked. Nothing Goes Cold.",
    );
    expect(page).toContain("real estate acquisition teams");
    expect(page).not.toContain("skip tracing");
    expect(page).toContain("AI qualification");
    expect(page).toContain("dialer");
    expect(page).toContain("pipeline");
  });
});
