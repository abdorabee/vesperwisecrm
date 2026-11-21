import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  writeCanonicalRecord: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/migration/writer", () => ({
  writeCanonicalRecord: mocks.writeCanonicalRecord,
}));

import { IMPORT_BATCH_SIZE } from "@/lib/migration/constants";
import {
  loadImportJobProgress,
  parseCanonicalPayload,
  processImportJob,
  processPendingImportJobs,
} from "@/lib/migration/process-job";
import type { CanonicalImportRecord } from "@/lib/migration/types";

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const JOB_ID = "job-1";
const USER_ID = "user-1";
const ROW_A = "row-1";
const ROW_B = "row-2";
const NOW = "2026-11-21T10:00:00.000Z";
const STAGE_MAP = { Pursue: "stage-1" };

type QueryResult = { data: unknown; error: unknown; count?: number | null };

const VALID_RECORD: CanonicalImportRecord = {
  contact: {
    firstName: "Jane",
    lastName: "Doe",
    email: "jane@example.com",
    phone: "555-0100",
    company: "Acme",
    source: "csv",
  },
  lead: {
    title: "123 Main St",
    value: "250000",
    pipelineStageName: "Pursue",
    tags: [],
    notes: "",
  },
  property: {},
};

function jobRow(overrides: Record<string, unknown> = {}) {
  return {
    id: JOB_ID,
    account_id: ACCOUNT_ID,
    created_by_user_id: USER_ID,
    source_crm: "carrot",
    status: "pending",
    imported_count: 0,
    failed_count: 0,
    error_summary: null,
    stage_map: STAGE_MAP,
    mapping: {},
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function pendingRow(
  id: string,
  rowNumber: number,
  payload: unknown = VALID_RECORD,
) {
  return {
    id,
    job_id: JOB_ID,
    account_id: ACCOUNT_ID,
    row_number: rowNumber,
    status: "pending",
    payload,
    error_text: null,
    created_at: NOW,
  };
}

function createSupabaseMock() {
  const updates: Array<{
    table: string;
    payload: unknown;
    eqs: Array<[string, unknown]>;
    ins: Array<[string, unknown]>;
  }> = [];
  const selects: Array<{
    table: string;
    eqs: Array<[string, unknown]>;
    ins: Array<[string, unknown]>;
    orders: string[];
    limits: number[];
  }> = [];
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
    let op: "select" | "update" = "select";
    const eqs: Array<[string, unknown]> = [];
    const ins: Array<[string, unknown]> = [];
    const orders: string[] = [];
    const limits: number[] = [];
    let recordedSelect = false;

    const builder = {
      select() {
        return builder;
      },
      eq(column: string, value: unknown) {
        eqs.push([column, value]);
        return builder;
      },
      in(column: string, values: unknown) {
        ins.push([column, values]);
        return builder;
      },
      order(column: string) {
        orders.push(column);
        return builder;
      },
      limit(value: number) {
        limits.push(value);
        return builder;
      },
      update(payload: unknown) {
        op = "update";
        updates.push({ table, payload, eqs, ins });
        return builder;
      },
      maybeSingle: async () => {
        if (op === "select" && !recordedSelect) {
          selects.push({ table, eqs, ins, orders, limits });
          recordedSelect = true;
        }
        return take(table, op);
      },
      then(
        onFulfilled: (value: QueryResult) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) {
        if (op === "select" && !recordedSelect) {
          selects.push({ table, eqs, ins, orders, limits });
          recordedSelect = true;
        }
        return Promise.resolve(take(table, op)).then(onFulfilled, onRejected);
      },
    };

    return builder;
  }

  return {
    from,
    updates,
    selects,
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

describe("parseCanonicalPayload", () => {
  test("rejects a malformed payload missing contact and lead", () => {
    expect(() => parseCanonicalPayload({})).toThrow();
  });

  test("rejects a payload with contact but no lead", () => {
    expect(() =>
      parseCanonicalPayload({
        contact: VALID_RECORD.contact,
        property: {},
      }),
    ).toThrow();
  });
});

describe("loadImportJobProgress", () => {
  test("maps unknown source_crm to generic and slices failed row errors", async () => {
    const failedRows = Array.from({ length: 21 }, (_, index) => ({
      status: "failed",
      error_text: `bad ${index + 1}`,
      row_number: index + 1,
    }));
    const supabase = createSupabaseMock();
    supabase.setResult("import_jobs", "select", {
      data: jobRow({
        source_crm: "salesforce",
        status: "processing",
        imported_count: 2,
        failed_count: 21,
      }),
      error: null,
    });
    supabase.setResult("import_job_rows", "select", {
      data: [
        ...failedRows,
        { status: "failed", error_text: null, row_number: 22 },
        { status: "pending", error_text: null, row_number: 23 },
        { status: "imported", error_text: null, row_number: 24 },
      ],
      error: null,
    });

    const progress = await loadImportJobProgress(supabase as never, JOB_ID);

    expect(progress).toEqual({
      id: JOB_ID,
      sourceCrm: "generic",
      status: "processing",
      importedCount: 2,
      failedCount: 21,
      pendingCount: 1,
      totalCount: 24,
      errors: failedRows.slice(0, 20).map((row) => `Row ${row.row_number}: ${row.error_text}`),
      errorSummary: null,
    });
    expect(progress.errors).toHaveLength(20);
    expect(progress.errors[0]).toBe("Row 1: bad 1");
    expect(progress.errors.at(-1)).toBe("Row 20: bad 20");
    expect(progress.errors.join("\n")).not.toContain("Row 21:");
    expect(progress.errors.join("\n")).not.toContain("Row 22:");
  });
});

describe("processImportJob", () => {
  beforeEach(() => {
    mocks.writeCanonicalRecord.mockReset();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(NOW));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test.each(["completed", "failed"] as const)(
    "returns progress for a %s job without claiming or writing records",
    async (status) => {
      const supabase = createSupabaseMock();
      supabase.setResult("import_jobs", "select", {
        data: jobRow({ status, imported_count: 4, failed_count: 1 }),
        error: null,
      });
      supabase.setResult("import_job_rows", "select", {
        data: [
          { status: "imported", error_text: null, row_number: 1 },
          { status: "failed", error_text: "nope", row_number: 2 },
        ],
        error: null,
      });

      const progress = await processImportJob(supabase as never, JOB_ID);

      expect(progress.status).toBe(status);
      expect(progress.importedCount).toBe(4);
      expect(progress.failedCount).toBe(1);
      expect(progress.errors).toEqual(["Row 2: nope"]);
      expect(supabase.updates).toEqual([]);
      expect(mocks.writeCanonicalRecord).not.toHaveBeenCalled();
    },
  );

  test("claims a pending job, imports the row, and marks the job completed", async () => {
    const supabase = createSupabaseMock();
    supabase.enqueue("import_jobs", "select", {
      data: jobRow(),
      error: null,
    });
    supabase.setResult("import_jobs", "update", { data: null, error: null });
    supabase.enqueue("import_job_rows", "select", {
      data: [pendingRow(ROW_A, 1)],
      error: null,
    });
    supabase.setResult("import_job_rows", "update", { data: null, error: null });
    supabase.enqueue("import_job_rows", "select", {
      data: [],
      error: null,
      count: 0,
    });
    supabase.enqueue("import_jobs", "select", {
      data: jobRow({ status: "completed", imported_count: 1 }),
      error: null,
    });
    supabase.enqueue("import_job_rows", "select", {
      data: [{ status: "imported", error_text: null, row_number: 1 }],
      error: null,
    });
    mocks.writeCanonicalRecord.mockResolvedValue(undefined);

    const progress = await processImportJob(supabase as never, JOB_ID);

    expect(mocks.writeCanonicalRecord).toHaveBeenCalledTimes(1);
    expect(mocks.writeCanonicalRecord).toHaveBeenCalledWith(supabase, {
      accountId: ACCOUNT_ID,
      actorUserId: USER_ID,
      record: VALID_RECORD,
      stageMap: STAGE_MAP,
    });

    expect(supabase.updates[0]).toEqual({
      table: "import_jobs",
      payload: { status: "processing", updated_at: NOW },
      eqs: [["id", JOB_ID]],
      ins: [["status", ["pending", "processing"]]],
    });
    expect(supabase.updates[1]).toEqual({
      table: "import_job_rows",
      payload: { status: "imported", error_text: null },
      eqs: [["id", ROW_A]],
      ins: [],
    });
    expect(supabase.updates[2]?.table).toBe("import_jobs");
    expect(supabase.updates[2]?.payload).toEqual({
      imported_count: 1,
      failed_count: 0,
      error_summary: null,
      status: "completed",
      updated_at: NOW,
    });
    expect(supabase.updates[2]?.eqs).toEqual([["id", JOB_ID]]);

    const pendingSelect = supabase.selects.find(
      (select) =>
        select.table === "import_job_rows" && select.limits.includes(IMPORT_BATCH_SIZE),
    );
    expect(pendingSelect?.eqs).toEqual([
      ["job_id", JOB_ID],
      ["status", "pending"],
    ]);
    expect(pendingSelect?.orders).toEqual(["row_number"]);

    expect(progress).toEqual({
      id: JOB_ID,
      sourceCrm: "carrot",
      status: "completed",
      importedCount: 1,
      failedCount: 0,
      pendingCount: 0,
      totalCount: 1,
      errors: [],
      errorSummary: null,
    });
  });

  test("isolates a write failure to that row and still imports the next row", async () => {
    const supabase = createSupabaseMock();
    supabase.enqueue("import_jobs", "select", {
      data: jobRow(),
      error: null,
    });
    supabase.setResult("import_jobs", "update", { data: null, error: null });
    supabase.enqueue("import_job_rows", "select", {
      data: [pendingRow(ROW_A, 1), pendingRow(ROW_B, 2)],
      error: null,
    });
    supabase.setResult("import_job_rows", "update", { data: null, error: null });
    supabase.enqueue("import_job_rows", "select", {
      data: [],
      error: null,
      count: 0,
    });
    supabase.enqueue("import_jobs", "select", {
      data: jobRow({
        status: "completed",
        imported_count: 1,
        failed_count: 1,
        error_summary: "Row 1: write failed",
      }),
      error: null,
    });
    supabase.enqueue("import_job_rows", "select", {
      data: [
        { status: "failed", error_text: "write failed", row_number: 1 },
        { status: "imported", error_text: null, row_number: 2 },
      ],
      error: null,
    });
    mocks.writeCanonicalRecord
      .mockRejectedValueOnce(new Error("write failed"))
      .mockResolvedValueOnce(undefined);

    const progress = await processImportJob(supabase as never, JOB_ID);

    expect(mocks.writeCanonicalRecord).toHaveBeenCalledTimes(2);
    expect(supabase.updates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: "import_job_rows",
          payload: { status: "failed", error_text: "write failed" },
          eqs: [["id", ROW_A]],
        }),
        expect.objectContaining({
          table: "import_job_rows",
          payload: { status: "imported", error_text: null },
          eqs: [["id", ROW_B]],
        }),
        expect.objectContaining({
          table: "import_jobs",
          payload: expect.objectContaining({
            imported_count: 1,
            failed_count: 1,
            error_summary: "Row 1: write failed",
            status: "completed",
          }),
        }),
      ]),
    );
    expect(progress.status).toBe("completed");
    expect(progress.importedCount).toBe(1);
    expect(progress.failedCount).toBe(1);
    expect(progress.errors).toEqual(["Row 1: write failed"]);
  });
});

describe("processPendingImportJobs", () => {
  beforeEach(() => {
    mocks.writeCanonicalRecord.mockReset();
  });

  test("lists pending and processing jobs and returns zeros when the list is empty", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("import_jobs", "select", { data: [], error: null });

    const result = await processPendingImportJobs(supabase as never);

    expect(result).toEqual({ jobs: 0, imported: 0, failed: 0 });
    expect(mocks.writeCanonicalRecord).not.toHaveBeenCalled();
    expect(supabase.updates).toEqual([]);
    expect(supabase.selects[0]).toEqual({
      table: "import_jobs",
      eqs: [],
      ins: [["status", ["pending", "processing"]]],
      orders: ["created_at"],
      limits: [5],
    });
  });
});
