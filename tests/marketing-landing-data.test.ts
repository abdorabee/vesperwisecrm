import { describe, expect, test } from "vitest";

import {
  MARKETING_HERO_ACTIVITY,
  MARKETING_HERO_COPY,
  MARKETING_HERO_ROWS,
  MARKETING_PREMISE_STEPS,
  MARKETING_PROOF_LOGOS,
} from "../src/components/marketing/mock/mock-data";

describe("redesigned marketing landing data", () => {
  test("keeps the approved hero copy and row values", () => {
    expect(MARKETING_HERO_COPY).toEqual({
      eyebrow: "ACQUISITION CRM / REAL ESTATE",
      title: "Every lead worked. Next task on the record.",
      subhead:
        "VesperWiseCRM is the pipeline CRM for real estate teams. Leads, stages, notes, tasks, and owners stay on one record.",
      primaryCta: "Book a demo",
      secondaryCta: "See the workflow",
      note: "Pricing is shown on our pricing page",
      browserTitle: "Lead Queue · All sources",
    });
    expect(MARKETING_HERO_COPY.title.toLowerCase()).not.toContain("cold");

    expect(MARKETING_HERO_ROWS).toHaveLength(7);
    expect(MARKETING_HERO_ROWS[0]).toEqual({
      name: "Marcus Whitfield",
      address: "4127 Kessler Blvd · Indianapolis, IN",
      source: "PPC",
      stage: "Qualified",
      selected: true,
    });
    expect(MARKETING_HERO_ROWS.at(-1)?.name).toBe("Walter Nkemdirim");
    expect(JSON.stringify(MARKETING_HERO_ROWS)).not.toMatch(
      /"score"|\$\d|%\b/,
    );
  });

  test("keeps the approved activity, proof logos, and premise captions", () => {
    expect(MARKETING_HERO_ACTIVITY).toEqual([
      {
        text: "Lead added from an imported list",
        time: "Activity",
        accent: false,
      },
      {
        text: "Moved to Qualified · probate timeline on the record",
        time: "Activity",
        accent: false,
      },
      {
        text: "Note added on the record",
        time: "Activity",
        accent: true,
      },
      {
        text: "Assigned to Dana R. · next task created",
        time: "Activity",
        accent: true,
      },
    ]);

    expect(MARKETING_PROOF_LOGOS).toEqual([]);

    expect(MARKETING_PREMISE_STEPS.map((step) => step.caption)).toEqual([
      "Every source — PPC, imported lists, referrals, probate — lands in one queue. No CSV shuffling.",
      "Track contact attempts, notes, and stage changes on one record. Know where every conversation stands.",
      "Notes, tasks, and owner sit on the lead. The next action is never a guess.",
    ]);
  });
});
