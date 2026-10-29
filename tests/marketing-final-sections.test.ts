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
        "Teams arrive at VesperWiseCRM from spreadsheets and generic CRMs where the next step dies in the gaps. The pipeline and the lead queue live on one record.",
      ),
    );
    expect(section).toContain("Leads in a shared spreadsheet");
    expect(section).toContain("One queue with clear stages and assignments");
    expect(section).toContain("Contact info scattered across tools");
    expect(section).toContain("All contact history on one record");
    expect(section).toContain("Manual email follow-up tracking");
    expect(section).toContain("Notes and tasks tracked on the record");
    expect(section).toContain("Pipeline buried in spreadsheet tabs");
    expect(section).toContain("Visual pipeline with drag-and-drop stages");
    expect(section).toContain("Follow-up depends on who remembers");
    expect(section).toContain("Tasks and owners keep the next step");
    expect(section.toLowerCase()).not.toContain("skip tracing");
    expectNoLegacyMarketingTokens(section);
  });

  test("states early access without invented customer quotes", () => {
    const section = source("src/components/marketing/sections/testimonials.tsx");

    expect(section).toContain("8.0");
    expect(section).toContain("EARLY ACCESS");
    expect(section).toContain("Pricing is shown on our pricing page");
    expect(section).toContain(
      "VesperWiseCRM is in early access. Pipeline and lead queue are live.",
    );
    expect(section).not.toMatch(/\$99|\$179|60-day|60 days|per seat/i);
    expect(section).not.toContain("PLACEHOLDER ·");
    expectNoLegacyMarketingTokens(section);
  });

  test("points the home pricing section at the pricing page", () => {
    const section = source(
      "src/components/marketing/sections/pricing-preview.tsx",
    );

    expect(section).toContain('id="pricing"');
    expect(section).toContain("9.0");
    expect(section).toContain("PRICING");
    expect(section).toContain("Pricing is shown on our pricing page");
    expect(section).toContain('href="/pricing"');
    expect(section).not.toMatch(/\$99|\$179|60-day|60 days|per seat/i);
    expect(section).not.toContain("Dialer");
    expect(section).not.toContain("Email sequences");
    expect(section).not.toContain("Start free trial");
    expect(section).not.toContain("Starter");
    expect(section).not.toContain("PUBLIC_SEAT_OFFER");
    expect(section).not.toContain("PUBLIC_BILLING_CADENCE");
    expect(section).not.toContain("Team roles & permissions");
    expect(section).not.toContain("Advanced pipeline views");
    expect(section).not.toContain("SSO and audit log");
    expect(section).not.toContain("Multi-market reporting");
    expect(section).not.toContain("API and data warehouse sync");
    expect(section).not.toContain("Dedicated onboarding");
    expect(section).not.toContain("Start pilot");
    expect(section).not.toContain('href: "/book-demo"');
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
    expect(section).not.toContain("60-DAY TEAM TRIAL");
    expect(section).not.toMatch(/60-day|60 days|\$99|\$179|per seat/i);
    expect(section).not.toContain("14-DAY PILOT");
    expect(section).toContain("DATA MIGRATION INCLUDED");
    expect(section).toContain("NO ANNUAL LOCK-IN");
    expectNoLegacyMarketingTokens(section);
  });
});

describe("marketing home page section order", () => {
  test("renders the redesigned sections in approved order", () => {
    const page = source("src/app/(marketing)/home/page.tsx");
    const expectedOrder = [
      "<Hero />",
      "<ProofStrip />",
      "<Premise />",
      "<Intake />",
      "<Qualify />",
      "<Engage />",
      "<Pipeline />",
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
      "VesperWise CRM — Every Lead Worked. Next Task on the Record.",
    );
    expect(page).not.toMatch(/goes cold/i);
    expect(page).toContain("A pipeline CRM for real estate teams");
    expect(page).not.toContain("skip tracing");
    expect(page).not.toMatch(/dialer|sequence|sms/i);
    expect(page).toContain("pipeline");
  });

  test("intake mock is source filtering, not a coming-soon outreach list pull", () => {
    expect(existsSync("src/components/marketing/coming-soon-pill.tsx")).toBe(
      false,
    );

    const panel = source(
      "src/components/marketing/mock/mock-search-panel.tsx",
    );
    expect(panel).toContain("FIG 1.1 — INTAKE FILTERED BY SOURCE");
    expect(panel).toContain("FILTERS · SOURCE");
    expect(panel).toContain("imported list, Marion County");
    expect(panel).toContain("Add to queue");
    expect(panel).toContain("SOURCES IN THE QUEUE");
    expect(panel).not.toContain("Coming soon");
    expect(panel).not.toContain("ComingSoonPill");
    expect(panel).not.toContain("18,402");
    expect(panel).not.toMatch(/skip trac|absentee|pre-foreclosure|dialer|sms|sequence/i);

    const og = source("src/app/(marketing)/home/opengraph-image.tsx");
    expect(og).toContain("Track every lead and its next task.");
    expect(og).not.toMatch(/dialer|sequence|sms|coming soon/i);
  });

  test("home mocks label sample data and omit invented performance figures", () => {
    const files = [
      "src/components/marketing/mock/mock-pipeline-board.tsx",
      "src/components/marketing/mock/mock-source-table.tsx",
      "src/components/marketing/mock/mock-funnel-chart.tsx",
      "src/components/marketing/mock/mock-rep-leaderboard.tsx",
      "src/components/marketing/mock/mock-lead-table.tsx",
      "src/components/marketing/mock/mock-lead-intel-panel.tsx",
      "src/components/marketing/sections/hero.tsx",
    ];
    for (const file of files) {
      const fileSource = source(file);
      expect(fileSource, file).not.toContain("$1.62M");
      expect(fileSource, file).not.toContain("$1,840");
      expect(fileSource, file).not.toContain("2.9%");
      expect(fileSource, file).not.toContain("$27.4");
      expect(fileSource, file).not.toContain("Unworked");
      expect(fileSource, file).not.toMatch(/Motivation ≥/);
    }
    expect(source("src/components/marketing/mock/mock-pipeline-board.tsx")).toContain(
      "SampleDataLabel",
    );
    expect(source("src/components/marketing/sections/hero.tsx")).toContain(
      "SampleDataLabel",
    );
    expect(source("src/lib/marketing/site-url.ts")).toContain(
      "https://www.vesperwisecrm.com",
    );
    expect(source("src/app/(marketing)/home/page.tsx")).not.toContain(
      "vesperwisecrm.vercel.app",
    );
    expect(source("src/lib/marketing/content-route.tsx")).not.toContain(
      "vesperwisecrm.vercel.app",
    );
  });
});
