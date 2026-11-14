import { describe, expect, test } from "vitest";
import { extractedFieldsToPropertyUpdate } from "@/lib/ai/apply-extracted-fields";
import type { ExtractedCallNoteFields } from "@/lib/ai/parse-call-notes";

describe("extractedFieldsToPropertyUpdate", () => {
  test("maps camelCase text fields to snake_case lead_properties columns", () => {
    const fields: ExtractedCallNoteFields = {
      condition: "Fair",
      occupancyStatus: "Owner occupied",
      followUpContact: "Call Jane tomorrow",
      notes: "Motivated seller",
    };

    expect(extractedFieldsToPropertyUpdate(fields)).toEqual({
      condition: "Fair",
      occupancy_status: "Owner occupied",
      follow_up_contact: "Call Jane tomorrow",
      notes: "Motivated seller",
    });
  });

  test("omits empty, whitespace-only, null, and missing text fields", () => {
    const fields: ExtractedCallNoteFields = {
      condition: "",
      occupancyStatus: "   ",
      followUpContact: null,
    };

    expect(extractedFieldsToPropertyUpdate(fields)).toEqual({});
  });

  test("parses numeric asking price, beds, baths, and square feet", () => {
    const fields: ExtractedCallNoteFields = {
      askingPrice: "$195,000",
      bedrooms: "3",
      bathrooms: "1.5",
      squareFeet: "1,200 sqft",
    };

    expect(extractedFieldsToPropertyUpdate(fields)).toEqual({
      asking_price: 195000,
      bedrooms: 3,
      bathrooms: 1.5,
      square_feet: 1200,
    });
  });

  test("skips numeric fields that parse to 0 or NaN", () => {
    const fields: ExtractedCallNoteFields = {
      askingPrice: "n/a",
      bedrooms: "0",
      bathrooms: "unknown",
      squareFeet: "0 sqft",
    };

    expect(extractedFieldsToPropertyUpdate(fields)).toEqual({});
  });
});
