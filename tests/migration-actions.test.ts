import { beforeEach, describe, expect, test, vi } from "vitest";
import { ZodError } from "zod";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requireAdminAccountId: vi.fn(),
  requireUserId: vi.fn(),
  requireBillingCapability: vi.fn(),
  createClient: vi.fn(),
  previewMigrationCsv: vi.fn(),
  buildRecordsFromCsv: vi.fn(),
  processImportJob: vi.fn(),
  loadImportJobProgress: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/supabase/account", () => ({
  requireAdminAccountId: mocks.requireAdminAccountId,
  requireUserId: mocks.requireUserId,
}));

vi.mock("@/lib/billing/access", () => ({
  requireBillingCapability: mocks.requireBillingCapability,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/migration/orchestrator", () => ({
  previewMigrationCsv: mocks.previewMigrationCsv,
  buildRecordsFromCsv: mocks.buildRecordsFromCsv,
}));

vi.mock("@/lib/migration/process-job", () => ({
  processImportJob: mocks.processImportJob,
  loadImportJobProgress: mocks.loadImportJobProgress,
}));

import {
  getImportJob,
  previewMigration,
  startMigrationJob,
} from "@/lib/actions/migration";
import { MAX_CSV_BYTES, MAX_MIGRATION_ROWS } from "@/lib/migration/constants";
import type { CanonicalImportRecord, ImportJobProgress } from "@/lib/migration/types";

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "user-1";
const JOB_ID = "22222222-2222-4222-8222-222222222222";
const OVERSIZED_CSV = "x".repeat(MAX_CSV_BYTES + 1);

type QueryResult = { data: unknown; error: unknown };

function createSupabaseMock() {
  const inserts: Array<{ table: string; payload: unknown }> = [];
  const fromTables: string[] = [];
  const queues: Record<string, QueryResult[]> = {};
  const defaults: Record<string, QueryResult> = {};

  function key(table: string, op: string) {
    return `${table}:${op}`;
  }

  function take(table: string, op: string): QueryResult {
    const queued = queues[key(table, op)];
    if (queued && queued.length > 0) {
      return queued.shift()!;
    }
    return defaults[key(table, op)] ?? { data: null, error: null };
  }

  function from(table: string) {
    fromTables.push(table);
    let op: "select" | "insert" | "update" | "delete" = "select";

    const builder = {
      select() {
        return builder;
      },
      eq() {
        return builder;
      },
      insert(payload: unknown) {
        op = "insert";
        inserts.push({ table, payload });
        return builder;
      },
      single: async () => take(table, op),
      then(
        onFulfilled: (value: QueryResult) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) {
        return Promise.resolve(take(table, op)).then(onFulfilled, onRejected);
      },
    };

    return builder;
  }

  return {
    from,
    inserts,
    fromTables,
    setResult(table: string, op: string, result: QueryResult) {
      defaults[key(table, op)] = result;
    },
    enqueue(table: string, op: string, result: QueryResult) {
      const k = key(table, op);
      queues[k] ??= [];
      queues[k].push(result);
    },
  };
}

function canonicalRecord(index = 0): CanonicalImportRecord {
  return {
    contact: {
      firstName: `First${index}`,
      lastName: "Doe",
      email: `user${index}@example.com`,
      phone: "555-0100",
      company: "Acme",
      source: "csv",
    },
    lead: {
      title: `Lead ${index}`,
      value: "1",
      pipelineStageName: "Pursue",
      tags: [],
      notes: "",
    },
    property: {},
  };
}

function progress(
  overrides: Partial<ImportJobProgress> = {},
): ImportJobProgress {
  return {
    id: JOB_ID,
    sourceCrm: "carrot",
    status: "pending",
    importedCount: 0,
    failedCount: 0,
    pendingCount: 1,
    totalCount: 1,
    errors: [],
    errorSummary: null,
    ...overrides,
  };
}

const START_INPUT = {
  csvText: "first_name,email\nAda,ada@example.com",
  sourceCrm: "carrot" as const,
  mapping: { first_name: "firstName" },
  stageMap: { Pursue: "stage-1" },
};

describe("previewMigration", () => {
  beforeEach(() => {
    mocks.revalidatePath.mockReset();
    mocks.requireAdminAccountId.mockReset();
    mocks.requireUserId.mockReset();
    mocks.requireBillingCapability.mockReset();
    mocks.createClient.mockReset();
    mocks.previewMigrationCsv.mockReset();
    mocks.buildRecordsFromCsv.mockReset();
    mocks.processImportJob.mockReset();
    mocks.loadImportJobProgress.mockReset();
    mocks.requireAdminAccountId.mockResolvedValue(ACCOUNT_ID);
  });

  test("requires admin before parsing an empty csv, then throws CSV content is required", async () => {
    await expect(previewMigration({ csvText: "" })).rejects.toThrow(
      "CSV content is required",
    );

    expect(mocks.requireAdminAccountId).toHaveBeenCalledTimes(1);
    expect(mocks.previewMigrationCsv).not.toHaveBeenCalled();
  });

  test("throws when the csv exceeds MAX_CSV_BYTES", async () => {
    await expect(
      previewMigration({ csvText: OVERSIZED_CSV, sourceCrm: "generic" }),
    ).rejects.toThrow("CSV content is too large (limit 5 MB)");

    expect(mocks.requireAdminAccountId).toHaveBeenCalledTimes(1);
    expect(mocks.previewMigrationCsv).not.toHaveBeenCalled();
  });

  test("rejects an invalid sourceCrm after admin and does not call the orchestrator", async () => {
    await expect(
      previewMigration({
        csvText: "a,b\n1,2",
        sourceCrm: "salesforce" as never,
      }),
    ).rejects.toBeInstanceOf(ZodError);

    expect(mocks.requireAdminAccountId).toHaveBeenCalledTimes(1);
    expect(mocks.previewMigrationCsv).not.toHaveBeenCalled();
  });

  test("returns the orchestrator preview for a tiny csv", async () => {
    const preview = {
      sourceCrm: "carrot",
      sourceLabel: "Carrot CRM",
      headers: ["seller_first_name"],
      sampleRows: [{ seller_first_name: "Ivy" }, { seller_first_name: "Bo" }],
      suggestedMapping: { seller_first_name: "firstName" },
      stageNames: ["Pursue"],
      recordCount: 2,
    };
    mocks.previewMigrationCsv.mockReturnValue(preview);

    await expect(
      previewMigration({ csvText: "seller_first_name\nIvy", sourceCrm: "carrot" }),
    ).resolves.toEqual(preview);

    expect(mocks.previewMigrationCsv).toHaveBeenCalledWith(
      "seller_first_name\nIvy",
      "carrot",
    );
    expect(preview.sampleRows.length).toBeLessThanOrEqual(3);
  });
});

describe("startMigrationJob", () => {
  beforeEach(() => {
    mocks.revalidatePath.mockReset();
    mocks.requireAdminAccountId.mockReset();
    mocks.requireUserId.mockReset();
    mocks.requireBillingCapability.mockReset();
    mocks.createClient.mockReset();
    mocks.previewMigrationCsv.mockReset();
    mocks.buildRecordsFromCsv.mockReset();
    mocks.processImportJob.mockReset();
    mocks.loadImportJobProgress.mockReset();
    mocks.requireAdminAccountId.mockResolvedValue(ACCOUNT_ID);
    mocks.requireUserId.mockResolvedValue(USER_ID);
    mocks.requireBillingCapability.mockResolvedValue(undefined);
  });

  test("rejects an invalid sourceCrm before admin, billing, or the client", async () => {
    await expect(
      startMigrationJob({
        ...START_INPUT,
        sourceCrm: "salesforce" as never,
      }),
    ).rejects.toBeInstanceOf(ZodError);

    expect(mocks.requireAdminAccountId).not.toHaveBeenCalled();
    expect(mocks.requireBillingCapability).not.toHaveBeenCalled();
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.buildRecordsFromCsv).not.toHaveBeenCalled();
  });

  test("rejects empty csv before admin, billing, or the client", async () => {
    await expect(
      startMigrationJob({ ...START_INPUT, csvText: "" }),
    ).rejects.toThrow("CSV content is required");

    expect(mocks.requireAdminAccountId).not.toHaveBeenCalled();
    expect(mocks.requireBillingCapability).not.toHaveBeenCalled();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  test("throws the row cap without inserting import_jobs", async () => {
    mocks.buildRecordsFromCsv.mockReturnValue(
      Array.from({ length: MAX_MIGRATION_ROWS + 1 }, () => canonicalRecord()),
    );
    const supabase = createSupabaseMock();
    mocks.createClient.mockResolvedValue(supabase);

    await expect(startMigrationJob(START_INPUT)).rejects.toThrow(
      "Import up to 5000 leads at a time",
    );

    expect(mocks.requireAdminAccountId).toHaveBeenCalledTimes(1);
    expect(mocks.requireBillingCapability).toHaveBeenCalledWith(
      ACCOUNT_ID,
      "pipeline",
    );
    expect(supabase.inserts).toEqual([]);
    expect(mocks.processImportJob).not.toHaveBeenCalled();
  });

  test("inserts the pending job and rows, processes, revalidates, and returns progress", async () => {
    const records = [canonicalRecord(0), canonicalRecord(1)];
    mocks.buildRecordsFromCsv.mockReturnValue(records);
    const done = progress({ status: "completed", importedCount: 2, pendingCount: 0, totalCount: 2 });
    mocks.processImportJob.mockResolvedValue(done);

    const supabase = createSupabaseMock();
    supabase.setResult("import_jobs", "insert", {
      data: { id: JOB_ID },
      error: null,
    });
    supabase.setResult("import_job_rows", "insert", {
      data: null,
      error: null,
    });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(startMigrationJob(START_INPUT)).resolves.toEqual(done);

    expect(supabase.inserts).toEqual([
      {
        table: "import_jobs",
        payload: {
          account_id: ACCOUNT_ID,
          created_by_user_id: USER_ID,
          source_crm: "carrot",
          status: "pending",
          mapping: START_INPUT.mapping,
          stage_map: START_INPUT.stageMap,
        },
      },
      {
        table: "import_job_rows",
        payload: records.map((record, index) => ({
          account_id: ACCOUNT_ID,
          job_id: JOB_ID,
          row_number: index + 2,
          payload: record,
          status: "pending",
        })),
      },
    ]);
    expect(mocks.processImportJob).toHaveBeenCalledWith(supabase, JOB_ID, {
      actorUserId: USER_ID,
      accountId: ACCOUNT_ID,
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/pipeline");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/settings/data-migration");
  });

  test("chunks 501 row inserts into 500 then 1", async () => {
    const records = Array.from({ length: 501 }, (_, index) =>
      canonicalRecord(index),
    );
    mocks.buildRecordsFromCsv.mockReturnValue(records);
    mocks.processImportJob.mockResolvedValue(
      progress({ totalCount: 501, pendingCount: 501 }),
    );

    const supabase = createSupabaseMock();
    supabase.setResult("import_jobs", "insert", {
      data: { id: JOB_ID },
      error: null,
    });
    supabase.enqueue("import_job_rows", "insert", { data: null, error: null });
    supabase.enqueue("import_job_rows", "insert", { data: null, error: null });
    mocks.createClient.mockResolvedValue(supabase);

    await startMigrationJob(START_INPUT);

    const rowInserts = supabase.inserts.filter(
      (entry) => entry.table === "import_job_rows",
    );
    expect(rowInserts).toHaveLength(2);
    expect(rowInserts[0].payload).toHaveLength(500);
    expect(rowInserts[1].payload).toHaveLength(1);
    expect((rowInserts[0].payload as { row_number: number }[])[0].row_number).toBe(
      2,
    );
    expect((rowInserts[1].payload as { row_number: number }[])[0].row_number).toBe(
      502,
    );
  });

  test("throws a job insert error without inserting rows or processing", async () => {
    mocks.buildRecordsFromCsv.mockReturnValue([canonicalRecord()]);
    const supabase = createSupabaseMock();
    supabase.setResult("import_jobs", "insert", {
      data: null,
      error: { message: "job insert failed" },
    });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(startMigrationJob(START_INPUT)).rejects.toThrow(
      "job insert failed",
    );

    expect(supabase.inserts).toEqual([
      expect.objectContaining({ table: "import_jobs" }),
    ]);
    expect(mocks.processImportJob).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  test("throws Failed to create import job when the insert returns no row", async () => {
    mocks.buildRecordsFromCsv.mockReturnValue([canonicalRecord()]);
    const supabase = createSupabaseMock();
    supabase.setResult("import_jobs", "insert", { data: null, error: null });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(startMigrationJob(START_INPUT)).rejects.toThrow(
      "Failed to create import job",
    );

    expect(
      supabase.inserts.filter((entry) => entry.table === "import_job_rows"),
    ).toEqual([]);
    expect(mocks.processImportJob).not.toHaveBeenCalled();
  });

  test("throws a row insert error and does not process the job", async () => {
    mocks.buildRecordsFromCsv.mockReturnValue([canonicalRecord()]);
    const supabase = createSupabaseMock();
    supabase.setResult("import_jobs", "insert", {
      data: { id: JOB_ID },
      error: null,
    });
    supabase.setResult("import_job_rows", "insert", {
      data: null,
      error: { message: "row insert failed" },
    });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(startMigrationJob(START_INPUT)).rejects.toThrow(
      "row insert failed",
    );

    expect(mocks.processImportJob).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

describe("getImportJob", () => {
  beforeEach(() => {
    mocks.revalidatePath.mockReset();
    mocks.requireAdminAccountId.mockReset();
    mocks.requireUserId.mockReset();
    mocks.createClient.mockReset();
    mocks.processImportJob.mockReset();
    mocks.loadImportJobProgress.mockReset();
    mocks.requireAdminAccountId.mockResolvedValue(ACCOUNT_ID);
  });

  test("rejects a non-uuid jobId before admin", async () => {
    await expect(getImportJob({ jobId: "not-a-uuid" })).rejects.toBeInstanceOf(
      ZodError,
    );

    expect(mocks.requireAdminAccountId).not.toHaveBeenCalled();
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.loadImportJobProgress).not.toHaveBeenCalled();
  });

  test("processes a pending job and returns that result without revalidating unless completed", async () => {
    const loaded = progress({ status: "pending" });
    const next = progress({ status: "processing" });
    mocks.loadImportJobProgress.mockResolvedValue(loaded);
    mocks.processImportJob.mockResolvedValue(next);
    const supabase = createSupabaseMock();
    mocks.createClient.mockResolvedValue(supabase);

    await expect(getImportJob({ jobId: JOB_ID })).resolves.toEqual(next);

    expect(mocks.loadImportJobProgress).toHaveBeenCalledWith(
      supabase,
      JOB_ID,
      ACCOUNT_ID,
    );
    expect(mocks.processImportJob).toHaveBeenCalledWith(supabase, JOB_ID, {
      accountId: ACCOUNT_ID,
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  test("revalidates /pipeline when processing a job completes", async () => {
    mocks.loadImportJobProgress.mockResolvedValue(
      progress({ status: "processing" }),
    );
    mocks.processImportJob.mockResolvedValue(progress({ status: "completed" }));
    const supabase = createSupabaseMock();
    mocks.createClient.mockResolvedValue(supabase);

    await expect(getImportJob({ jobId: JOB_ID })).resolves.toEqual(
      progress({ status: "completed" }),
    );

    expect(mocks.processImportJob).toHaveBeenCalledTimes(1);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/pipeline");
    expect(mocks.revalidatePath).not.toHaveBeenCalledWith(
      "/settings/data-migration",
    );
  });

  test.each(["completed", "failed"] as const)(
    "returns %s progress without processing or revalidating",
    async (status) => {
      const loaded = progress({ status });
      mocks.loadImportJobProgress.mockResolvedValue(loaded);
      const supabase = createSupabaseMock();
      mocks.createClient.mockResolvedValue(supabase);

      await expect(getImportJob({ jobId: JOB_ID })).resolves.toEqual(loaded);

      expect(mocks.processImportJob).not.toHaveBeenCalled();
      expect(mocks.revalidatePath).not.toHaveBeenCalled();
    },
  );
});
