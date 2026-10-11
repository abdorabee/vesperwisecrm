import { describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { describeScoreChanged } from "@/lib/activities/describe-score-changed";
import { leadScoreTool, parseLeadScore } from "@/lib/ai/score-lead";
import {
  filterByMotivationScore,
  hasMotivationScoreAtLeast,
} from "@/lib/leads/motivation-filter";

describe("motivation score tool", () => {
  test("asks for a motivation score that is separate from likelihood", () => {
    expect(leadScoreTool.input_schema.required).toContain("motivation_score");
    expect(leadScoreTool.input_schema.required).toContain("score");
    expect(leadScoreTool.input_schema.properties.motivation_score.description).toMatch(
      /Seller motivation/,
    );
    expect(leadScoreTool.input_schema.properties.score.description).toMatch(
      /Likelihood to close/,
    );
  });

  test("keeps the two numbers distinct when parsing tool output", () => {
    expect(
      parseLeadScore({
        score: 41,
        motivation_score: 88,
        summary: "Urgent seller, price is high",
        positives: ["Moving next week"],
        risks: ["Asking price is above comps"],
      }),
    ).toEqual({
      score: 41,
      motivationScore: 88,
      summary: "Urgent seller, price is high",
      positives: ["Moving next week"],
      risks: ["Asking price is above comps"],
    });
  });

  test("rejects a likelihood score labeled as motivation", () => {
    expect(() =>
      parseLeadScore({
        score: 88,
        summary: "Missing the motivation number",
        positives: [],
        risks: [],
      }),
    ).toThrow(/unexpected shape/);
  });
});

describe("motivation score filter", () => {
  const leads = [
    { id: "hot", motivation_score: 70 },
    { id: "hotter", motivation_score: 91 },
    { id: "warm", motivation_score: 69 },
    { id: "unscored", motivation_score: null },
  ];

  test("keeps scores of 70 and above", () => {
    expect(hasMotivationScoreAtLeast(70)).toBe(true);
    expect(hasMotivationScoreAtLeast(69)).toBe(false);
    expect(hasMotivationScoreAtLeast(null)).toBe(false);
    expect(filterByMotivationScore(leads, true).map((lead) => lead.id)).toEqual([
      "hot",
      "hotter",
    ]);
    expect(filterByMotivationScore(leads, false)).toHaveLength(4);
  });
});

describe("score changed activity", () => {
  test("describes a motivation change", () => {
    expect(
      describeScoreChanged({ field: "motivation_score", from: null, to: 84 }),
    ).toBe("Score changed: motivation set to 84");
    expect(
      describeScoreChanged({ field: "motivation_score", from: 40, to: 84 }),
    ).toBe("Score changed: motivation 40 to 84");
  });
});
