import { describe, expect, test } from "vitest";

import {
  MARKETING_PIPELINE_COLUMNS,
  MARKETING_PIPELINE_FOOTER,
} from "../src/components/marketing/mock/mock-pipeline-board";
import {
  MARKETING_FUNNEL_ROWS,
} from "../src/components/marketing/mock/mock-funnel-chart";
import {
  MARKETING_REP_ROWS,
} from "../src/components/marketing/mock/mock-rep-leaderboard";
import {
  MARKETING_SOURCE_KPIS,
  MARKETING_SOURCE_ROWS,
} from "../src/components/marketing/mock/mock-source-table";
import {
  MARKETING_OTHER_WORKFLOWS,
  MARKETING_WORKFLOW_STEPS,
} from "../src/components/marketing/sections/automate";

describe("marketing Pipeline, Automate, and Understand data", () => {
  test("keeps approved pipeline stages, hot cards, and footer totals", () => {
    expect(MARKETING_PIPELINE_COLUMNS.map(({ name, count, value }) => ({ name, count, value }))).toEqual([
      { name: "OFFER OUT", count: "9", value: "$1.62M" },
      { name: "NEGOTIATION", count: "6", value: "$1.05M" },
      { name: "UNDER CONTRACT", count: "4", value: "$742K" },
      { name: "CLOSING", count: "3", value: "$518K" },
      { name: "CLOSED", count: "11", value: "$1.94M" },
    ]);

    expect(
      MARKETING_PIPELINE_COLUMNS.flatMap((column) =>
        column.cards.filter((card) => card.hot).map((card) => card.addr),
      ),
    ).toEqual(["15 Halstead Ave", "231 W Morris St", "3312 Brookville Rd"]);

    expect(MARKETING_PIPELINE_FOOTER).toEqual([
      { label: "OPEN PIPELINE", value: "$3.93M" },
      { label: "WEIGHTED", value: "$1.71M" },
      { label: "AVG SPREAD", value: "$27.4K" },
      { label: "AVG DAYS TO CONTRACT", value: "11" },
    ]);
  });

  test("keeps approved automation workflow steps and companion rules", () => {
    expect(MARKETING_WORKFLOW_STEPS).toEqual([
      {
        kind: "TRIGGER",
        title: "New lead created",
        detail: "Any source",
        accent: true,
      },
      {
        kind: "ACTION",
        title: "Skip trace + enrich",
        detail: "Phones, email, property data",
      },
      {
        kind: "ACTION",
        title: "Score motivation",
        detail: "AI, from form + call data",
        accent: true,
      },
      {
        kind: "BRANCH",
        title: "Score ≥ 70?",
        detail: "Yes → assign · No → nurture",
      },
      {
        kind: "ACTION",
        title: "Route to rep",
        detail: "Round robin by market",
      },
      {
        kind: "ACTION",
        title: "Queue power dial",
        detail: "First touch within 5 min",
        accent: true,
      },
    ]);

    expect(MARKETING_OTHER_WORKFLOWS).toEqual([
      {
        tag: "WORKFLOW 07",
        text: "No contact after 6 attempts → drop to long-term nurture, revisit in 90 days.",
      },
      {
        tag: "WORKFLOW 11",
        text: "Deal untouched for 4 days in Negotiation → notify manager, reassign.",
      },
      {
        tag: "WORKFLOW 14",
        text: "Contract signed → create closing checklist, notify title, log spread.",
      },
    ]);
  });

  test("keeps approved understand KPI, source, funnel, and rep values", () => {
    expect(MARKETING_SOURCE_KPIS).toEqual([
      { label: "CONTRACTS", value: "34", delta: "+21% VS PRIOR 90D" },
      { label: "COST / CONTRACT", value: "$1,840", delta: "−14%" },
      { label: "AVG SPREAD", value: "$27.4k", delta: "+$2.1k" },
      { label: "LEAD → CONTRACT", value: "2.9%", delta: "+0.6 PTS" },
    ]);

    expect(MARKETING_SOURCE_ROWS).toEqual([
      { name: "PPC", pct: "88%", contracts: "12", cpc: "$1,410", accent: true },
      { name: "Cold list", pct: "66%", contracts: "9", cpc: "$980", accent: true },
      { name: "Probate", pct: "48%", contracts: "6", cpc: "$2,240" },
      { name: "Direct mail", pct: "34%", contracts: "4", cpc: "$3,110" },
      { name: "Referral", pct: "22%", contracts: "3", cpc: "$310" },
    ]);

    expect(MARKETING_FUNNEL_ROWS).toEqual([
      { label: "LEADS", value: "1,182", height: "100%" },
      { label: "CONTACTED", value: "746", height: "63%" },
      { label: "QUALIFIED", value: "318", height: "27%" },
      { label: "APPOINTMENT", value: "141", height: "16%" },
      { label: "OFFER", value: "72", height: "11%", accent: true },
      { label: "CONTRACT", value: "34", height: "7%", accent: true },
    ]);

    expect(MARKETING_REP_ROWS).toEqual([
      { name: "Dana Reyes", dials: "1,942", contacts: "421", appts: "58", contracts: "14", hot: true },
      { name: "Marcus Ju", dials: "1,708", contacts: "364", appts: "49", contracts: "11", hot: true },
      { name: "Aisha Karim", dials: "1,455", contacts: "298", appts: "37", contracts: "6" },
      { name: "Owen Brandt", dials: "1,120", contacts: "204", appts: "22", contracts: "3" },
      { name: "Nina Sokolov", dials: "864", contacts: "151", appts: "14", contracts: "0" },
    ]);
  });
});
