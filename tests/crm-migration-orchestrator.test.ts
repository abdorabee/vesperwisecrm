import { describe, expect, test } from "vitest";
import {
  buildRecordsFromCsv,
  previewMigrationCsv,
} from "../src/lib/migration/orchestrator";
import {
  optionalNumber,
  resolveStageId,
} from "../src/lib/migration/writer-helpers";
import { parseTagNames } from "../src/lib/migration/mapping";

const CARROT_CSV = `seller_first_name,seller_phone,street_address,price_asking,motivation,campaign_name,notes,labels,pipeline
Ivy,3123121234,123 Main Street,500000,Hot,Campaign B,Called twice,wholesale;cash,Pursue
,5550000,99 Empty St,1,Cold,Campaign B,Skip me,,Qualification`;

describe("migration orchestrator", () => {
  test("previewMigrationCsv detects Carrot and extracts stage names", () => {
    const preview = previewMigrationCsv(CARROT_CSV, "carrot");
    expect(preview.sourceCrm).toBe("carrot");
    expect(preview.sourceLabel).toBe("Carrot CRM");
    expect(preview.recordCount).toBe(2);
    expect(preview.stageNames).toEqual(["Pursue", "Qualification"]);
    expect(preview.suggestedMapping.seller_first_name).toBe("firstName");
    expect(preview.suggestedMapping.labels).toBe("tags");
  });

  test("buildRecordsFromCsv returns canonical rows including leftover-safe notes", () => {
    const preview = previewMigrationCsv(CARROT_CSV, "carrot");
    const records = buildRecordsFromCsv(
      CARROT_CSV,
      preview.suggestedMapping,
      "carrot",
    );
    expect(records).toHaveLength(2);
    expect(records[0].contact.firstName).toBe("Ivy");
    expect(records[0].lead.tags).toEqual(["wholesale", "cash"]);
    expect(records[0].lead.pipelineStageName).toBe("Pursue");
    expect(records[1].contact.firstName).toBe("");
  });
});

describe("writer helpers", () => {
  test("parseTagNames splits and dedupes labels", () => {
    expect(parseTagNames("wholesale, cash, wholesale")).toEqual([
      "wholesale",
      "cash",
    ]);
  });

  test("resolveStageId matches mapped names and ignores blanks", () => {
    const stageMap = {
      Pursue: "stage-1",
      qualification: "stage-2",
    };
    expect(resolveStageId("Pursue", stageMap)).toBe("stage-1");
    expect(resolveStageId("Qualification", stageMap)).toBe("stage-2");
    expect(resolveStageId("", stageMap)).toBeNull();
  });

  test("optionalNumber strips currency formatting", () => {
    expect(optionalNumber("$500,000")).toBe(500000);
    expect(optionalNumber("")).toBeNull();
  });
});
