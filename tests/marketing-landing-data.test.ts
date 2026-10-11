import { describe, expect, test } from "vitest";

import {
  MARKETING_HERO_COPY,
  MARKETING_HERO_ROWS,
  MARKETING_PREMISE_STEPS,
  MARKETING_PROOF_LOGOS,
  MARKETING_SELECTED_LEAD,
} from "../src/components/marketing/mock/mock-data";

describe("redesigned marketing landing data", () => {
  test("keeps the approved hero copy and row values", () => {
    expect(MARKETING_HERO_COPY).toEqual({
      eyebrow: "ACQUISITION CRM / REAL ESTATE",
      title: "Every lead worked. Nothing goes cold.",
      subhead:
        "VesperWiseCRM is the acquisition system for real estate teams — pipeline, email sequences (early), and the lead queue in one place. Early access available now.",
      primaryCta: "Book a demo",
      secondaryCta: "See the workflow",
      note: "No card. Team free for 60 days.",
      browserTitle: "Lead Queue · All sources",
    });

    expect(MARKETING_HERO_ROWS).toHaveLength(7);
    expect(MARKETING_HERO_ROWS[0]).toEqual({
      name: "Marcus Whitfield",
      address: "4127 Kessler Blvd · Indianapolis, IN",
      source: "PPC",
      stage: "Qualified",
      owner: "Dana Reyes",
      touch: "4m ago",
      selected: true,
    });
    expect(MARKETING_HERO_ROWS.at(-1)?.name).toBe("Walter Nkemdirim");
  });

  test("shows the pipeline card fields instead of scores or call summaries", () => {
    expect(MARKETING_SELECTED_LEAD).toEqual({
      title: "4127 Kessler Blvd",
      contact: "Marcus Whitfield",
      owner: "Dana Reyes",
      stage: "Qualified",
    });

    expect(MARKETING_PROOF_LOGOS).toEqual([]);

    expect(MARKETING_PREMISE_STEPS.map((step) => step.caption)).toEqual([
      "Every source — PPC, cold lists, referrals, probate — lands in one queue. No CSV shuffling.",
      "Track contact attempts, notes, and stage changes on one record. Know where every conversation stands.",
      "Email sequences (early), tasks, and pipeline sit on the same record. The next action is never a guess.",
    ]);
  });
});
