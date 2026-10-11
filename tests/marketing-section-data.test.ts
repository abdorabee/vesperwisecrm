import { describe, expect, test } from "vitest";

import {
  MARKETING_DAY_SEQUENCE,
  MARKETING_ENGAGE_STATS,
  MARKETING_FUNNEL_BARS,
  MARKETING_INTAKE_FILTERS,
  MARKETING_INTAKE_SOURCES,
  MARKETING_QUALIFY_TAGS,
  MARKETING_SELECTED_LEAD,
  MARKETING_UP_NEXT,
  MARKETING_WAVEFORM_BARS,
} from "../src/components/marketing/mock/mock-data";

describe("marketing Intake, Qualify, and Engage data", () => {
  test("keeps approved intake sources, filters, and computed funnel bars", () => {
    expect(MARKETING_INTAKE_SOURCES).toEqual([
      { n: "01", label: "PPC, SEO and inbound seller forms", meta: "REAL TIME" },
      { n: "02", label: "Cold lists, direct mail and probate records", meta: "CSV / API" },
      { n: "03", label: "Duplicate detection on import", meta: "AUTO" },
    ]);
    expect(
      MARKETING_INTAKE_SOURCES.map((source) => source.label).join(" ").toLowerCase(),
    ).not.toContain("skip tracing");

    expect(MARKETING_INTAKE_FILTERS).toEqual([
      { label: "Absentee owner", on: true },
      { label: "Equity above 40%", on: true },
      { label: "Tenure 5+ years", on: true },
      { label: "Pre-foreclosure", on: false },
      { label: "Tax delinquent", on: false },
      { label: "Vacant", on: true },
    ]);

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

  test("keeps the pipeline card on the qualify record, plus notes tags", () => {
    expect(MARKETING_SELECTED_LEAD).toEqual({
      title: "4127 Kessler Blvd",
      contact: "Marcus Whitfield",
      owner: "Dana Reyes",
      stage: "Qualified",
    });

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
      { label: "Email sequences", value: "Early" },
      { label: "Contact timeline", value: "Live" },
      { label: "Pipeline stages", value: "Live" },
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
      "R. Petrossian · Appointment",
      "Estate of H. Calloway · Contacted",
      "P. Raghunathan · New",
      "T. Lindgren · Nurture",
      "W. Nkemdirim · No contact",
    ]);

    expect(MARKETING_DAY_SEQUENCE).toEqual([
      { day: "D1", action: "Email: intro", state: 2 },
      { day: "D2", action: "Email: process outline", state: 2 },
      { day: "D3", action: "Email: follow-up", state: 1 },
      { day: "D4", action: "Task: check the reply", state: 0 },
      { day: "D5", action: "Email: check-in", state: 0 },
      { day: "D6", action: "Email: comps + offer", state: 0 },
      { day: "D7", action: "Email: last note, then nurture", state: 0 },
    ]);
  });
});
