import { describe, expect, test } from "vitest";
import { resolvePipelineStageId } from "../src/lib/pipeline-stage-filter";

const CONTACTED_ID = "11111111-1111-4111-8111-111111111111";
const QUALIFIED_ID = "22222222-2222-4222-8222-222222222222";

const stages = [
  { id: CONTACTED_ID, name: "Contacted" },
  { id: QUALIFIED_ID, name: "Qualified" },
];

describe("resolvePipelineStageId", () => {
  test("maps /pipeline?stage=contacted to the Contacted stage id", () => {
    expect(resolvePipelineStageId(stages, "contacted")).toBe(CONTACTED_ID);
  });

  test("matches stage names case-insensitively", () => {
    expect(resolvePipelineStageId(stages, "Contacted")).toBe(CONTACTED_ID);
    expect(resolvePipelineStageId(stages, "CONTACTED")).toBe(CONTACTED_ID);
  });

  test("passes through a stage UUID for the Stage dropdown", () => {
    expect(resolvePipelineStageId(stages, CONTACTED_ID)).toBe(CONTACTED_ID);
  });

  test("ignores unknown stage names instead of treating them as UUIDs", () => {
    expect(resolvePipelineStageId(stages, "not-a-stage")).toBeUndefined();
  });
});
