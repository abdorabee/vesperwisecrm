import { describe, expect, test } from "vitest";

import { MARKETING_PIPELINE_COLUMNS } from "../src/components/marketing/mock/mock-pipeline-board";
import { MARKETING_FUNNEL_ROWS } from "../src/components/marketing/mock/mock-funnel-chart";
import { MARKETING_REP_ROWS } from "../src/components/marketing/mock/mock-rep-leaderboard";
import { MARKETING_SOURCE_ROWS } from "../src/components/marketing/mock/mock-source-table";

describe("marketing Pipeline and Understand data", () => {
  test("keeps sample pipeline stages without revenue or count claims", () => {
    expect(MARKETING_PIPELINE_COLUMNS.map((column) => column.name)).toEqual([
      "OFFER OUT",
      "NEGOTIATION",
      "UNDER CONTRACT",
      "CLOSING",
      "CLOSED",
    ]);
    expect(JSON.stringify(MARKETING_PIPELINE_COLUMNS)).not.toMatch(
      /\$|%|\b\d+k\b|\b\d+M\b/i,
    );
    expect(
      MARKETING_PIPELINE_COLUMNS.flatMap((column) =>
        column.cards.map((card) => card.addr),
      ),
    ).toEqual([
      "4127 Kessler Blvd",
      "882 Ridgeline Ct",
      "15 Halstead Ave",
      "77 Ellsworth Rd",
      "231 W Morris St",
      "9040 Sunfield Dr",
      "3312 Brookville Rd",
      "620 Linden Way",
      "18 Carrow St",
    ]);
  });

  test("keeps sample understand sources, stages, and owners without performance figures", () => {
    expect(MARKETING_SOURCE_ROWS).toEqual([
      { name: "PPC", accent: true },
      { name: "Imported list", accent: true },
      { name: "Probate" },
      { name: "Direct mail" },
      { name: "Referral" },
    ]);
    expect(JSON.stringify(MARKETING_SOURCE_ROWS)).not.toMatch(/\$|%|\d/);

    expect(MARKETING_FUNNEL_ROWS.map((row) => row.label)).toEqual([
      "LEADS",
      "CONTACTED",
      "QUALIFIED",
      "APPOINTMENT",
      "OFFER",
      "CONTRACT",
    ]);
    expect(MARKETING_FUNNEL_ROWS.every((row) => !("value" in row))).toBe(true);

    expect(MARKETING_REP_ROWS).toEqual([
      { name: "Dana Reyes" },
      { name: "Marcus Ju" },
      { name: "Aisha Karim" },
      { name: "Owen Brandt" },
      { name: "Nina Sokolov" },
    ]);
    expect(JSON.stringify(MARKETING_REP_ROWS)).not.toMatch(/\d/);
  });
});
