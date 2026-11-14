import { describe, expect, test } from "vitest";
import {
  callerIntakeSchema,
  importLeadsCsvMappedSchema,
  intakeLeadSchema,
  newLeadSchema,
  previewCsvMappingSchema,
} from "@/lib/validations/lead";

function issueMessages(error: { issues: { message: string }[] }) {
  return error.issues.map((issue) => issue.message);
}

const PIPELINE_STAGE_ID = "11111111-1111-4111-8111-111111111111";
const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const OVERSIZED_CSV = "x".repeat(5 * 1024 * 1024 + 1);

describe("newLeadSchema", () => {
  test("rejects an empty title", () => {
    const result = newLeadSchema.safeParse({
      title: "",
      firstName: "Jane",
      pipelineStageId: PIPELINE_STAGE_ID,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(issueMessages(result.error)).toContain("Title is required");
    }
  });

  test("rejects an empty firstName", () => {
    const result = newLeadSchema.safeParse({
      title: "123 Main St",
      firstName: "",
      pipelineStageId: PIPELINE_STAGE_ID,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(issueMessages(result.error)).toContain("First name is required");
    }
  });

  test("rejects an invalid email", () => {
    const result = newLeadSchema.safeParse({
      title: "123 Main St",
      firstName: "Jane",
      pipelineStageId: PIPELINE_STAGE_ID,
      email: "not-an-email",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(issueMessages(result.error)).toContain("Invalid email");
    }
  });

  test("rejects negative bedrooms", () => {
    const result = newLeadSchema.safeParse({
      title: "123 Main St",
      firstName: "Jane",
      pipelineStageId: PIPELINE_STAGE_ID,
      property: { bedrooms: "-1" },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(issueMessages(result.error)).toContain("Must be a positive number");
    }
  });

  test("accepts an empty-string email", () => {
    const result = newLeadSchema.safeParse({
      title: "123 Main St",
      firstName: "Jane",
      pipelineStageId: PIPELINE_STAGE_ID,
      email: "",
    });

    expect(result.success).toBe(true);
  });

  test("accepts a complete valid payload with pipelineStageId", () => {
    const result = newLeadSchema.safeParse({
      title: "123 Main St",
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      phone: "555-0100",
      pipelineStageId: PIPELINE_STAGE_ID,
      property: {
        addressLine1: "123 Main St",
        bedrooms: "3",
      },
    });

    expect(result.success).toBe(true);
  });
});

describe("intakeLeadSchema", () => {
  const validIntake = {
    title: "123 Main St",
    firstName: "Jane",
    accountId: ACCOUNT_ID,
  };

  test("succeeds without pipelineStageId", () => {
    const result = intakeLeadSchema.safeParse(validIntake);

    expect(result.success).toBe(true);
  });

  test("rejects a non-uuid accountId", () => {
    const result = intakeLeadSchema.safeParse({
      ...validIntake,
      accountId: "not-a-uuid",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(issueMessages(result.error)).toContain("Account is required");
    }
  });

  test("transforms a numeric value to a string", () => {
    const result = intakeLeadSchema.safeParse({
      ...validIntake,
      value: 150000,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.value).toBe("150000");
    }
  });

  test("rejects an empty callSummary", () => {
    const result = intakeLeadSchema.safeParse({
      ...validIntake,
      callSummary: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(issueMessages(result.error)).toContain(
        "callSummary cannot be empty",
      );
    }
  });

  test("rejects a callSummary longer than 20000 characters", () => {
    const result = intakeLeadSchema.safeParse({
      ...validIntake,
      callSummary: "a".repeat(20001),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(issueMessages(result.error)).toContain("callSummary is too long");
    }
  });
});

describe("callerIntakeSchema", () => {
  test("rejects a missing phone", () => {
    const result = callerIntakeSchema.safeParse({
      addressLine1: "123 Main St",
      property: {},
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes("phone"))).toBe(
        true,
      );
    }
  });

  test("rejects an empty phone", () => {
    const result = callerIntakeSchema.safeParse({
      phone: "",
      addressLine1: "123 Main St",
      property: {},
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(issueMessages(result.error)).toContain("Phone is required");
    }
  });

  test("rejects a missing addressLine1", () => {
    const result = callerIntakeSchema.safeParse({
      phone: "555-0100",
      property: {},
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.path.includes("addressLine1")),
      ).toBe(true);
    }
  });

  test("rejects an empty addressLine1", () => {
    const result = callerIntakeSchema.safeParse({
      phone: "555-0100",
      addressLine1: "",
      property: {},
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(issueMessages(result.error)).toContain(
        "Property address is required",
      );
    }
  });

  test("succeeds with only phone and addressLine1", () => {
    const result = callerIntakeSchema.safeParse({
      phone: "555-0100",
      addressLine1: "123 Main St",
      property: {},
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.firstName).toBeUndefined();
    }
  });
});

describe("previewCsvMappingSchema", () => {
  test("rejects empty csvText", () => {
    const result = previewCsvMappingSchema.safeParse({ csvText: "" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(issueMessages(result.error)).toContain("CSV content is required");
    }
  });

  test("rejects csvText longer than 5 MB", () => {
    const result = previewCsvMappingSchema.safeParse({
      csvText: OVERSIZED_CSV,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(issueMessages(result.error)).toContain(
        "CSV content is too large (limit 5 MB)",
      );
    }
  });
});

describe("importLeadsCsvMappedSchema", () => {
  test("rejects empty csvText", () => {
    const result = importLeadsCsvMappedSchema.safeParse({
      csvText: "",
      mapping: {},
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(issueMessages(result.error)).toContain("CSV content is required");
    }
  });

  test("rejects csvText longer than 5 MB", () => {
    const result = importLeadsCsvMappedSchema.safeParse({
      csvText: OVERSIZED_CSV,
      mapping: {},
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(issueMessages(result.error)).toContain(
        "CSV content is too large (limit 5 MB)",
      );
    }
  });
});
