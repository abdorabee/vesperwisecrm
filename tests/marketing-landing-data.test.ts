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
      title: "Every lead worked. Nothing goes cold.",
      subhead:
        "VesperWiseCRM is the acquisition system for real estate teams — pipeline, email sequences, and lead queue in one place. Early access available now.",
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
      score: 92,
      touch: "4m ago",
      selected: true,
    });
    expect(MARKETING_HERO_ROWS.at(-1)?.name).toBe("Walter Nkemdirim");
  });

  test("keeps the approved activity, proof logos, and premise captions", () => {
    expect(MARKETING_HERO_ACTIVITY).toEqual([
      {
        text: "Lead added from a cold list",
        time: "TODAY 09:14",
        accent: false,
      },
      {
        text: "AI call summary: wants out before probate closes",
        time: "TODAY 09:41",
        accent: false,
      },
      {
        text: "Motivation score raised 74 → 92",
        time: "TODAY 09:41",
        accent: true,
      },
      {
        text: "Assigned to Dana R. · callback task created",
        time: "TODAY 09:42",
        accent: true,
      },
    ]);

    expect(MARKETING_PROOF_LOGOS).toEqual([]);

    expect(MARKETING_PREMISE_STEPS.map((step) => step.caption)).toEqual([
      "Every source — PPC, cold lists, referrals, probate — lands in one queue. No CSV shuffling.",
      "Track contact attempts, notes, and stage changes on one record. Know where every conversation stands.",
      "Email sequences, tasks and pipeline sit on the same record. The next action is never a guess.",
    ]);
  });
});
