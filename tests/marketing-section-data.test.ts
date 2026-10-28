import { describe, expect, test } from "vitest";

import {
  MARKETING_DAY_PLAN,
  MARKETING_ENGAGE_STATS,
  MARKETING_FUNNEL_BARS,
  MARKETING_INTAKE_FILTERS,
  MARKETING_INTAKE_SOURCES,
  MARKETING_QUALIFY_SCORES,
  MARKETING_QUALIFY_TAGS,
  MARKETING_UP_NEXT,
  MARKETING_WAVEFORM_BARS,
} from "../src/components/marketing/mock/mock-data";

describe("marketing Intake, Qualify, and Engage data", () => {
  test("keeps approved intake sources, filters, and computed funnel bars", () => {
    expect(MARKETING_INTAKE_SOURCES).toEqual([
      { n: "01", label: "PPC, SEO and inbound seller forms", meta: "REAL TIME" },
      { n: "02", label: "Imported lists, direct mail, and probate records", meta: "CSV / API" },
      { n: "03", label: "Duplicate detection on import", meta: "AUTO" },
    ]);
    expect(
      MARKETING_INTAKE_SOURCES.map((source) => source.label).join(" ").toLowerCase(),
    ).not.toContain("skip tracing");

    expect(MARKETING_INTAKE_FILTERS).toEqual([
      { label: "PPC and inbound forms", on: true },
      { label: "Imported lists", on: true },
      { label: "Referrals", on: true },
      { label: "Direct mail", on: false },
      { label: "Probate records", on: true },
    ]);
    expect(
      MARKETING_INTAKE_FILTERS.map((filter) => filter.label).join(" ").toLowerCase(),
    ).not.toMatch(/absentee|equity|foreclosure|delinquent|vacant|skip/);

    expect(MARKETING_FUNNEL_BARS).toHaveLength(26);
    expect(MARKETING_FUNNEL_BARS.slice(0, 3)).toEqual([
      { height: 128, tone: "bg2", delaySeconds: 0 },
      { height: 121, tone: "bg2", delaySeconds: 0.022 },
      { height: 120, tone: "bg2", delaySeconds: 0.044 },
    ]);
    expect(MARKETING_FUNNEL_BARS[17]).toMatchObject({ tone: "strong" });
    expect(MARKETING_FUNNEL_BARS[21]).toMatchObject({ tone: "accent" });
    expect(MARKETING_FUNNEL_BARS[25]).toEqual({
      height: 18,
      tone: "accent",
      delaySeconds: 0.55,
    });
  });

  test("keeps approved qualify scores and tags", () => {
    expect(MARKETING_QUALIFY_SCORES).toEqual([
      { label: "MOTIVATION", value: "92", pct: 92, tone: "accent" },
      { label: "TIMELINE", value: "30d", pct: 84, tone: "accent" },
      { label: "CONDITION", value: "C-", pct: 46, tone: "strong" },
      { label: "SPREAD", value: "$29k", pct: 62, tone: "strong" },
    ]);

    expect(MARKETING_QUALIFY_TAGS).toEqual([
      "probate",
      "inherited",
      "two mortgages",
      "no agent",
      "cash offer",
      "roof + HVAC",
    ]);
  });

  test("keeps approved engage stats, waveform, queue, and sequence", () => {
    expect(MARKETING_ENGAGE_STATS).toEqual([
      { label: "Notes", value: "On the lead" },
      { label: "Tasks", value: "On the lead" },
      { label: "Owner", value: "On the lead" },
    ]);

    expect(MARKETING_WAVEFORM_BARS).toHaveLength(48);
    expect(MARKETING_WAVEFORM_BARS.slice(0, 3)).toEqual([
      { height: 4, active: true },
      { height: 19, active: true },
      { height: 29, active: true },
    ]);
    expect(MARKETING_WAVEFORM_BARS[33]).toMatchObject({ active: true });
    expect(MARKETING_WAVEFORM_BARS[34]).toMatchObject({ active: false });
    expect(MARKETING_WAVEFORM_BARS[47]).toMatchObject({ active: false });

    expect(MARKETING_UP_NEXT).toEqual([
      "R. Petrossian · 85",
      "Estate of H. Calloway · 88",
      "P. Raghunathan · 71",
      "T. Lindgren · 54",
      "W. Nkemdirim · 41",
    ]);

    expect(MARKETING_DAY_PLAN).toEqual([
      { day: "D1", action: "Task: confirm the owner", state: 0 },
      { day: "D1", action: "Note: offer context", state: 0 },
      { day: "D2", action: "Task: review the timeline", state: 0 },
      { day: "D3", action: "Task: check the stage", state: 0 },
      { day: "D5", action: "Task check-in", state: 0 },
      { day: "D6", action: "Task: comps on the record", state: 0 },
      { day: "D7", action: "Task: set the next step", state: 0 },
    ]);
    expect(JSON.stringify(MARKETING_DAY_PLAN).toLowerCase()).not.toMatch(/sms|sequence|dial/);
  });
});
