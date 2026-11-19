import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requireAccountId: vi.fn(),
  requireUserId: vi.fn(),
  requireBillingCapability: vi.fn(),
  createClient: vi.fn(),
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

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

import {
  createFollowUpForCurrentStep,
  enrollLeadInSequence,
} from "@/lib/actions/enrollments";

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "user-1";
const LEAD_ID = "lead-1";
const SEQUENCE_ID = "seq-1";
const ENROLLMENT_ID = "enroll-1";
const TASK_ID = "task-1";
const NOW = Date.parse("2026-11-19T10:00:00.000Z");
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

type QueryResult = { data: unknown; error: unknown };

function createSupabaseMock() {
  const inserts: Array<{ table: string; payload: unknown }> = [];
  const updates: Array<{
    table: string;
    payload: unknown;
    eqs: Array<[string, unknown]>;
  }> = [];
  const fromTables: string[] = [];
  const isFilters: Array<[string, string, unknown]> = [];
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
    let op: "select" | "insert" | "update" = "select";
    const eqs: Array<[string, unknown]> = [];

    const builder = {
      select() {
        return builder;
      },
      eq(column: string, value: unknown) {
        eqs.push([column, value]);
        return builder;
      },
      is(column: string, value: unknown) {
        isFilters.push([table, column, value]);
        return builder;
      },
      insert(payload: unknown) {
        op = "insert";
        inserts.push({ table, payload });
        return builder;
      },
      update(payload: unknown) {
        op = "update";
        updates.push({ table, payload, eqs });
        return builder;
      },
      single: async () => take(table, op),
      maybeSingle: async () => take(table, op),
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
    updates,
    fromTables,
    isFilters,
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

function enrollmentRow(
  overrides: Record<string, unknown> = {},
) {
  return {
    id: ENROLLMENT_ID,
    account_id: ACCOUNT_ID,
    lead_id: LEAD_ID,
    sequence_id: SEQUENCE_ID,
    current_step_number: 1,
    ...overrides,
  };
}

describe("enrollLeadInSequence", () => {
  beforeEach(() => {
    mocks.revalidatePath.mockReset();
    mocks.requireAccountId.mockReset();
    mocks.requireUserId.mockReset();
    mocks.requireBillingCapability.mockReset();
    mocks.createClient.mockReset();
    mocks.requireAccountId.mockResolvedValue(ACCOUNT_ID);
    mocks.requireUserId.mockResolvedValue(USER_ID);
    mocks.requireBillingCapability.mockResolvedValue(undefined);
    vi.spyOn(Date, "now").mockReturnValue(NOW);
  });

  afterEach(() => {
    vi.mocked(Date.now).mockRestore();
  });

  test("throws when the lead is missing and does not insert an enrollment", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("leads", "select", { data: null, error: null });
    supabase.setResult("sequences", "select", {
      data: { name: "Nurture" },
      error: null,
    });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(enrollLeadInSequence(LEAD_ID, SEQUENCE_ID)).rejects.toThrow(
      "Lead and sequence must belong to this workspace",
    );

    expect(supabase.isFilters).toContainEqual(["leads", "deleted_at", null]);
    expect(
      supabase.inserts.filter((row) => row.table === "lead_sequence_enrollments"),
    ).toEqual([]);
  });

  test("throws when the sequence is missing and does not insert an enrollment", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("leads", "select", { data: { id: LEAD_ID }, error: null });
    supabase.setResult("sequences", "select", { data: null, error: null });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(enrollLeadInSequence(LEAD_ID, SEQUENCE_ID)).rejects.toThrow(
      "Lead and sequence must belong to this workspace",
    );

    expect(
      supabase.inserts.filter((row) => row.table === "lead_sequence_enrollments"),
    ).toEqual([]);
  });

  test("sets next_step_due_at from the first step delay and records sequence_enrolled", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("leads", "select", { data: { id: LEAD_ID }, error: null });
    supabase.setResult("sequences", "select", {
      data: { name: "Nurture" },
      error: null,
    });
    supabase.setResult("sequence_steps", "select", {
      data: { delay_days: 2 },
      error: null,
    });
    mocks.createClient.mockResolvedValue(supabase);

    await enrollLeadInSequence(LEAD_ID, SEQUENCE_ID);

    expect(mocks.requireBillingCapability).toHaveBeenCalledWith(
      ACCOUNT_ID,
      "sequences",
    );
    expect(supabase.inserts[0]).toEqual({
      table: "lead_sequence_enrollments",
      payload: {
        account_id: ACCOUNT_ID,
        lead_id: LEAD_ID,
        sequence_id: SEQUENCE_ID,
        next_step_due_at: new Date(NOW + TWO_DAYS_MS).toISOString(),
      },
    });
    expect(supabase.inserts[1]).toEqual({
      table: "activities",
      payload: {
        account_id: ACCOUNT_ID,
        lead_id: LEAD_ID,
        type: "sequence_enrolled",
        actor_user_id: USER_ID,
        payload: { sequence_name: "Nurture" },
      },
    });
  });

  test("stores next_step_due_at null when the sequence has no first step", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("leads", "select", { data: { id: LEAD_ID }, error: null });
    supabase.setResult("sequences", "select", {
      data: { name: "Nurture" },
      error: null,
    });
    supabase.setResult("sequence_steps", "select", { data: null, error: null });
    mocks.createClient.mockResolvedValue(supabase);

    await enrollLeadInSequence(LEAD_ID, SEQUENCE_ID);

    expect(supabase.inserts[0]?.payload).toEqual(
      expect.objectContaining({ next_step_due_at: null }),
    );
  });

  test("does not insert activity when the enrollment insert fails", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("leads", "select", { data: { id: LEAD_ID }, error: null });
    supabase.setResult("sequences", "select", {
      data: { name: "Nurture" },
      error: null,
    });
    supabase.setResult("sequence_steps", "select", { data: null, error: null });
    supabase.setResult("lead_sequence_enrollments", "insert", {
      data: null,
      error: { message: "enrollment insert failed" },
    });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(enrollLeadInSequence(LEAD_ID, SEQUENCE_ID)).rejects.toThrow(
      "enrollment insert failed",
    );

    expect(supabase.inserts.map((row) => row.table)).toEqual([
      "lead_sequence_enrollments",
    ]);
  });
});

describe("createFollowUpForCurrentStep", () => {
  beforeEach(() => {
    mocks.revalidatePath.mockReset();
    mocks.requireAccountId.mockReset();
    mocks.requireUserId.mockReset();
    mocks.requireBillingCapability.mockReset();
    mocks.createClient.mockReset();
    mocks.requireAccountId.mockResolvedValue(ACCOUNT_ID);
    mocks.requireUserId.mockResolvedValue(USER_ID);
    mocks.requireBillingCapability.mockResolvedValue(undefined);
    vi.spyOn(Date, "now").mockReturnValue(NOW);
  });

  afterEach(() => {
    vi.mocked(Date.now).mockRestore();
  });

  test("throws when the enrollment is missing", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("lead_sequence_enrollments", "select", {
      data: null,
      error: null,
    });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(createFollowUpForCurrentStep(ENROLLMENT_ID)).rejects.toThrow(
      "Enrollment not found",
    );

    expect(supabase.fromTables).not.toContain("sequence_steps");
    expect(supabase.inserts).toEqual([]);
  });

  test("throws when the current step is missing", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("lead_sequence_enrollments", "select", {
      data: enrollmentRow(),
      error: null,
    });
    supabase.setResult("sequence_steps", "select", { data: null, error: null });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(createFollowUpForCurrentStep(ENROLLMENT_ID)).rejects.toThrow(
      "This sequence step is no longer available",
    );

    expect(supabase.inserts).toEqual([]);
  });

  test("uses a trimmed subject sliced to 160, advances to the next step, and records sequence_step_number", async () => {
    const supabase = createSupabaseMock();
    const longSubject = `  ${"A".repeat(200)}  `;
    supabase.setResult("lead_sequence_enrollments", "select", {
      data: enrollmentRow({ current_step_number: 2 }),
      error: null,
    });
    supabase.enqueue("sequence_steps", "select", {
      data: {
        subject: longSubject,
        body_template: "  Call them tomorrow.  ",
        delay_days: 1,
      },
      error: null,
    });
    supabase.enqueue("sequence_steps", "select", {
      data: { id: "step-3", delay_days: 3 },
      error: null,
    });
    supabase.setResult("lead_tasks", "insert", {
      data: { id: TASK_ID },
      error: null,
    });
    mocks.createClient.mockResolvedValue(supabase);

    await createFollowUpForCurrentStep(ENROLLMENT_ID);

    const expectedTitle = "A".repeat(160);
    const dueAt = new Date(NOW + 24 * 60 * 60 * 1000).toISOString();
    expect(supabase.inserts[0]).toEqual({
      table: "lead_tasks",
      payload: {
        account_id: ACCOUNT_ID,
        lead_id: LEAD_ID,
        title: expectedTitle,
        description: "Call them tomorrow.",
        due_at: dueAt,
        assigned_user_id: USER_ID,
        created_by_user_id: USER_ID,
      },
    });
    expect(supabase.inserts[1]).toEqual({
      table: "activities",
      payload: {
        account_id: ACCOUNT_ID,
        lead_id: LEAD_ID,
        type: "task_created",
        actor_user_id: USER_ID,
        payload: {
          task_id: TASK_ID,
          title: expectedTitle,
          due_at: dueAt,
          sequence_step_number: 2,
        },
      },
    });
    expect(supabase.updates).toEqual([
      {
        table: "lead_sequence_enrollments",
        payload: {
          current_step_number: 3,
          next_step_due_at: new Date(NOW + 3 * 24 * 60 * 60 * 1000).toISOString(),
        },
        eqs: [
          ["id", ENROLLMENT_ID],
          ["account_id", ACCOUNT_ID],
        ],
      },
    ]);
  });

  test("uses the first line of body_template when subject is empty", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("lead_sequence_enrollments", "select", {
      data: enrollmentRow(),
      error: null,
    });
    supabase.enqueue("sequence_steps", "select", {
      data: {
        subject: "   ",
        body_template: "  Check in Friday\nThen send docs",
        delay_days: 0,
      },
      error: null,
    });
    supabase.enqueue("sequence_steps", "select", { data: null, error: null });
    supabase.setResult("lead_tasks", "insert", {
      data: { id: TASK_ID },
      error: null,
    });
    mocks.createClient.mockResolvedValue(supabase);

    await createFollowUpForCurrentStep(ENROLLMENT_ID);

    expect(supabase.inserts[0]?.payload).toEqual(
      expect.objectContaining({
        title: "Check in Friday",
        description: "Check in Friday\nThen send docs",
      }),
    );
  });

  test("falls back to Follow up, stores a null description, and completes when there is no next step", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("lead_sequence_enrollments", "select", {
      data: enrollmentRow(),
      error: null,
    });
    supabase.enqueue("sequence_steps", "select", {
      data: {
        subject: null,
        body_template: "   \n  ",
        delay_days: 0,
      },
      error: null,
    });
    supabase.enqueue("sequence_steps", "select", { data: null, error: null });
    supabase.setResult("lead_tasks", "insert", {
      data: { id: TASK_ID },
      error: null,
    });
    mocks.createClient.mockResolvedValue(supabase);

    await createFollowUpForCurrentStep(ENROLLMENT_ID);

    expect(supabase.inserts[0]?.payload).toEqual(
      expect.objectContaining({
        title: "Follow up",
        description: null,
      }),
    );
    expect(supabase.updates).toHaveLength(1);
    expect(supabase.updates[0]?.table).toBe("lead_sequence_enrollments");
    const payload = supabase.updates[0]?.payload as {
      status: string;
      completed_at: string;
      next_step_due_at: null;
    };
    expect(payload.status).toBe("completed");
    expect(payload.next_step_due_at).toBeNull();
    expect(new Date(payload.completed_at).toISOString()).toBe(payload.completed_at);
  });
});
