import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const ROOT = process.cwd();

function source(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

const MARKETING_SOURCES = [
  "src/components/marketing/content/pages.ts",
  "src/components/marketing/sections/intake.tsx",
  "src/components/marketing/sections/qualify.tsx",
  "src/components/marketing/sections/engage.tsx",
  "src/components/marketing/sections/pipeline.tsx",
  "src/components/marketing/sections/automate.tsx",
  "src/components/marketing/sections/pricing-preview.tsx",
  "src/components/marketing/mock/mock-data.ts",
  "src/components/marketing/mock/mock-call-transcript.tsx",
  "src/components/marketing/mock/mock-power-dial.tsx",
  "src/components/marketing/mock/mock-lead-intel-panel.tsx",
  "src/components/marketing/mock/mock-pipeline-board.tsx",
  "src/lib/billing/public-offer.ts",
];

describe("phase 8 marketing copy", () => {
  const combined = MARKETING_SOURCES.map(source).join("\n");

  test("keeps coming soon on claims the open pull requests do not implement", () => {
    expect(source("src/components/marketing/sections/qualify.tsx")).toContain(
      "Every call is transcribed (coming soon)",
    );
    expect(source("src/components/marketing/sections/qualify.tsx")).toContain(
      "AI call summary (coming soon)",
    );
    expect(source("src/components/marketing/mock/mock-call-transcript.tsx")).toContain(
      "EVERY CALL IS TRANSCRIBED (COMING SOON)",
    );
    expect(source("src/components/marketing/mock/mock-call-transcript.tsx")).toContain(
      "AI CALL SUMMARY (COMING SOON)",
    );
    expect(source("src/components/marketing/mock/mock-data.ts")).toContain(
      "AI call summary (coming soon)",
    );
    expect(source("src/components/marketing/mock/mock-data.ts")).toContain(
      'label: "VERIFIED PHONES", value: "Coming soon"',
    );
    expect(source("src/components/marketing/sections/intake.tsx")).toContain(
      "Skip tracing (coming soon)",
    );
    expect(source("src/components/marketing/content/pages.ts")).toContain(
      "SMS sequences (coming soon)",
    );
    expect(source("src/components/marketing/sections/engage.tsx")).toContain(
      "SMS sequences (coming soon)",
    );
  });

  test("describes shipped pull request behavior without a production reply or completed call", () => {
    const pipeline = source("src/components/marketing/sections/pipeline.tsx");
    expect(pipeline).toContain("No next action");
    expect(pipeline).toContain("separate from the AI score");

    const qualify = source("src/components/marketing/sections/qualify.tsx");
    expect(qualify).toContain("Creating a lead requests an AI score");
    expect(qualify).toContain("70");

    const intake = source("src/components/marketing/sections/intake.tsx");
    expect(intake).toContain("skipped or merged");

    const engage = source("src/components/marketing/sections/engage.tsx");
    expect(engage).toContain("stops that lead");
    expect(engage).toContain("You start each call");
    expect(engage).toContain("blocked at 9:00 p.m.");

    const automate = source("src/components/marketing/sections/automate.tsx");
    expect(automate).toContain("fire once per lead");
    expect(automate).toContain("notify the manager and reassign");
    expect(automate).toContain("90 days");

    const pricing = source("src/components/marketing/sections/pricing-preview.tsx");
    expect(pricing).toContain("A one-time Polar order can grant Team.");
    expect(pricing).toContain("$99");
    expect(pricing).toContain("$179");
    expect(pricing).not.toContain("$600");

    expect(combined).not.toMatch(/production reply|live test call|test call was placed|completed production call/i);
    expect(combined).not.toContain("POWER DIAL");
    expect(combined).not.toContain("LOCAL PRESENCE");
    expect(combined).not.toContain("auto-advance");
    expect(combined).not.toContain("$600");
  });

  test("leaves the public prices and the 60-day Team trial copy unchanged", () => {
    const offer = source("src/lib/billing/public-offer.ts");
    expect(offer).toContain(
      "Every new workspace gets Team for 60 days, no card.",
    );
    expect(offer).toContain("Starter is $99 per seat per month");
    expect(offer).toContain("Team is $179 per seat per month");
    expect(source("src/components/marketing/mock/mock-data.ts")).toContain(
      "No card. Team free for 60 days.",
    );
    expect(source("src/components/marketing/sections/testimonials.tsx")).toContain(
      "Team for 60 days. No card.",
    );
    expect(source("src/components/marketing/sections/final-cta.tsx")).toContain(
      "60-DAY TEAM TRIAL",
    );
  });
});
