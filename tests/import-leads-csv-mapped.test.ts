import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requireAccountId: vi.fn(),
  requireUserId: vi.fn(),
  requireBillingCapability: vi.fn(),
  runTriggeredWorkflows: vi.fn(),
  createClient: vi.fn(),
  createLeadRecord: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/supabase/account", () => ({
  requireAccountId: mocks.requireAccountId,
  requireUserId: mocks.requireUserId,
}));

vi.mock("@/lib/billing/access", () => ({
  requireBillingCapability: mocks.requireBillingCapability,
}));

vi.mock("@/lib/workflows/engine", () => ({
  runTriggeredWorkflows: mocks.runTriggeredWorkflows,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/leads/create-lead", () => ({
  createLeadRecord: mocks.createLeadRecord,
}));

import {
  importLeadsCsvMapped,
  previewCsvMapping,
} from "@/lib/actions/leads";

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "user-1";
const PIPELINE_STAGE_ID = "22222222-2222-4222-8222-222222222222";

function csv(header: string, rows: string[]) {
  return [header, ...rows].join("\n");
}

describe("importLeadsCsvMapped", () => {
  beforeEach(() => {
    mocks.revalidatePath.mockReset();
    mocks.requireAccountId.mockReset();
    mocks.requireUserId.mockReset();
    mocks.requireBillingCapability.mockReset();
    mocks.runTriggeredWorkflows.mockReset();
    mocks.createClient.mockReset();
    mocks.createLeadRecord.mockReset();
    mocks.requireAccountId.mockResolvedValue(ACCOUNT_ID);
    mocks.requireUserId.mockResolvedValue(USER_ID);
    mocks.requireBillingCapability.mockResolvedValue(undefined);
    mocks.runTriggeredWorkflows.mockResolvedValue(undefined);
    mocks.createClient.mockResolvedValue({ from: vi.fn() });
    mocks.createLeadRecord.mockResolvedValue({
      leadId: "lead-new",
      contactId: "contact-new",
    });
  });

  test("throws when parsed rows exceed 500 and does not create leads", async () => {
    const rows = Array.from({ length: 501 }, (_, index) => `Jane${index}`);

    await expect(
      importLeadsCsvMapped({
        csvText: csv("Name", rows),
        mapping: { Name: "firstName" },
      }),
    ).rejects.toThrow("Import up to 500 leads at a time");

    expect(mocks.createLeadRecord).not.toHaveBeenCalled();
    expect(mocks.runTriggeredWorkflows).not.toHaveBeenCalled();
  });

  test("counts a missing firstName as a failed row without creating a lead", async () => {
    const result = await importLeadsCsvMapped({
      csvText: csv("Name,Email", [",jane@example.com"]),
      mapping: { Name: "firstName", Email: "email" },
    });

    expect(result).toEqual({
      imported: 0,
      failed: 1,
      errors: ["Row 2: a name column is required"],
    });
    expect(mocks.createLeadRecord).not.toHaveBeenCalled();
    expect(mocks.runTriggeredWorkflows).not.toHaveBeenCalled();
  });

  test("creates a lead with CSV import source fallback and fires lead_created workflows", async () => {
    const supabase = { from: vi.fn() };
    mocks.createClient.mockResolvedValue(supabase);

    const result = await importLeadsCsvMapped({
      csvText: csv("Name", ["Jane"]),
      mapping: { Name: "firstName" },
    });

    expect(result).toEqual({ imported: 1, failed: 0, errors: [] });
    expect(mocks.createLeadRecord).toHaveBeenCalledTimes(1);
    expect(mocks.createLeadRecord).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        accountId: ACCOUNT_ID,
        actorUserId: USER_ID,
        firstName: "Jane",
        source: "CSV import",
      }),
    );
    expect(mocks.runTriggeredWorkflows).toHaveBeenCalledTimes(1);
    expect(mocks.runTriggeredWorkflows).toHaveBeenCalledWith(
      supabase,
      ACCOUNT_ID,
      "lead_created",
      { leadId: "lead-new" },
    );
  });

  test("title falls back from mapped title to company to first and last name", async () => {
    await importLeadsCsvMapped({
      csvText: csv(
        "Name,Last,Company,Title",
        [
          "Jane,Doe,Acme,Mapped Title",
          "Jane,Doe,Acme,",
          "Jane,Doe,,",
        ],
      ),
      mapping: {
        Name: "firstName",
        Last: "lastName",
        Company: "company",
        Title: "title",
      },
    });

    const titles = mocks.createLeadRecord.mock.calls.map(
      (call) => (call[1] as { title: string }).title,
    );
    expect(titles).toEqual(["Mapped Title", "Acme", "Jane Doe"]);
  });

  test("uses fallbackSource when the mapped source is empty", async () => {
    await importLeadsCsvMapped({
      csvText: csv("Name,Source", ["Jane,"]),
      mapping: { Name: "firstName", Source: "source" },
      fallbackSource: "Direct mail",
    });

    expect(mocks.createLeadRecord.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ source: "Direct mail" }),
    );
  });

  test("normalizes mapped contractStatus before createLeadRecord", async () => {
    await importLeadsCsvMapped({
      csvText: csv(
        "Name,Status",
        [
          "Jane,Under Contract",
          "John,under-contract",
          "Ada,OFFERED",
          "Bob,bogus",
          "Eve,",
        ],
      ),
      mapping: { Name: "firstName", Status: "contractStatus" },
    });

    const statuses = mocks.createLeadRecord.mock.calls.map(
      (call) =>
        (call[1] as { property: { contractStatus: string } }).property
          .contractStatus,
    );
    expect(statuses).toEqual([
      "under_contract",
      "under_contract",
      "offered",
      "none",
      "none",
    ]);
  });

  test("isolates a failing row so later rows still import and fire workflows", async () => {
    mocks.createLeadRecord.mockImplementation(
      async (_supabase: unknown, input: { firstName: string }) => {
        if (input.firstName === "Alice") {
          throw new Error("db down");
        }
        return { leadId: "lead-bob", contactId: "contact-bob" };
      },
    );

    const result = await importLeadsCsvMapped({
      csvText: csv("Name", ["Alice", "Bob"]),
      mapping: { Name: "firstName" },
      pipelineStageId: PIPELINE_STAGE_ID,
    });

    expect(result.failed).toBe(1);
    expect(result.imported).toBe(1);
    expect(result.errors).toEqual(["Row 2: db down"]);
    expect(mocks.createLeadRecord).toHaveBeenCalledTimes(2);
    expect(mocks.runTriggeredWorkflows).toHaveBeenCalledTimes(1);
    expect(mocks.runTriggeredWorkflows).toHaveBeenCalledWith(
      expect.anything(),
      ACCOUNT_ID,
      "lead_created",
      { leadId: "lead-bob" },
    );
  });
});

describe("previewCsvMapping", () => {
  beforeEach(() => {
    mocks.requireAccountId.mockReset();
    mocks.requireAccountId.mockResolvedValue(ACCOUNT_ID);
  });

  test("does not parse CSV when requireAccountId rejects", async () => {
    mocks.requireAccountId.mockRejectedValue(new Error("Not authenticated"));

    await expect(
      previewCsvMapping({ csvText: "" }),
    ).rejects.toThrow("Not authenticated");
  });

  test("returns headers, the first three sample rows, and guessed mapping", async () => {
    const preview = await previewCsvMapping({
      csvText: csv("first_name,email,company", [
        "Jane,jane@example.com,Acme",
        "John,john@example.com,Beta",
        "Ada,ada@example.com,Gamma",
        "Bob,bob@example.com,Delta",
      ]),
    });

    expect(mocks.requireAccountId).toHaveBeenCalledTimes(1);
    expect(preview.headers).toEqual(["first_name", "email", "company"]);
    expect(preview.sampleRows).toHaveLength(3);
    expect(preview.sampleRows[0]).toEqual({
      first_name: "Jane",
      email: "jane@example.com",
      company: "Acme",
    });
    expect(preview.suggestedMapping).toEqual(
      expect.objectContaining({
        first_name: "firstName",
        email: "email",
        company: "company",
      }),
    );
  });
});
