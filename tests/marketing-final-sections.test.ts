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
        "Teams arrive at VesperWiseCRM from a spreadsheet, a generic CRM, a separate dialer and a skip tracing vendor. The handoffs between them are where leads die.",
      ),
    );
    expect(section).toContain("Leads in a shared spreadsheet");
    expect(section).toContain("One queue, scored and assigned");
    expect(section).toContain("Skip tracing in a separate vendor portal");
    expect(section).toContain("Enrichment on record creation");
    expect(section).toContain("Dialer disconnected from the CRM");
    expect(section).toContain("Dial from the record, logged automatically");
    expect(section).toContain("Call notes typed from memory");
    expect(section).toContain("Transcribed, summarised, scored");
    expect(section).toContain("Follow-up depends on who remembers");
    expect(section).toContain("Sequences and workflows own the follow-up");
    expectNoLegacyMarketingTokens(section);
  });

  test("keeps the approved placeholder testimonials", () => {
    const section = source("src/components/marketing/sections/testimonials.tsx");

    expect(section).toContain("8.0");
    expect(section).toContain("FROM THE FIELD");
    expect(section).toContain("PLACEHOLDER — REPLACE WITH ATTRIBUTED QUOTES");
    expect(section).toContain(
      "The queue tells the team who to call and why. That decision used to eat the first hour of every morning.",
    );
    expect(section).toContain("PLACEHOLDER · ACQUISITIONS MANAGER");
    expect(section).toContain(
      "Call summaries mean a lead can change hands without losing the context of the conversation.",
    );
    expect(section).toContain("PLACEHOLDER · TEAM LEAD");
    expect(section).toContain(
      "We stopped losing revived leads. The ninety-day nurture rule pays for the software on its own.",
    );
    expect(section).toContain("PLACEHOLDER · OWNER");
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
    expect(section).toContain("Per seat. Everything included.");
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
    expect(section).toContain("ANNUAL");
    expect(sectionText).toContain(
      "For multi-market operations with dispositions and in-house closing.",
    );
    expect(section).toContain("Skip tracing and telephony billed at cost.");
    expect(sectionText).toContain(
      "Figures shown are placeholders pending final pricing sign-off.",
    );
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
    expect(section).toContain('href="/login"');
    expect(section).toContain("See pricing");
    expect(section).toContain('href="#pricing"');
    expect(section).toContain("14-DAY PILOT");
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
    expect(page).toContain("skip tracing");
    expect(page).toContain("AI qualification");
    expect(page).toContain("dialer");
    expect(page).toContain("pipeline");
  });
});
