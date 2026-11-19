import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requireAccountId: vi.fn(),
  requireUserId: vi.fn(),
  requireWritableBilling: vi.fn(),
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
  requireWritableBilling: mocks.requireWritableBilling,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

import { completeLeadTask, createLeadTask } from "@/lib/actions/tasks";

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "user-1";
const LEAD_ID = "lead-1";
const TASK_ID = "task-1";
const NEXT_TASK_ID = "task-2";
const DUE_AT = "2026-11-20T15:00:00.000Z";
const NEXT_DUE_AT = "2026-11-21T15:00:00.000Z";

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
  };
}

function createInput(
  overrides: Partial<Parameters<typeof createLeadTask>[1]> = {},
) {
  return {
    title: "Call back",
    dueAt: DUE_AT,
    priority: "normal" as const,
    ...overrides,
  };
}

function completeInput(
  overrides: Partial<Parameters<typeof completeLeadTask>[1]> = {},
) {
  return {
    nextTitle: "Send offer",
    nextDueAt: NEXT_DUE_AT,
    nextPriority: "high" as const,
    ...overrides,
  };
}

describe("createLeadTask", () => {
  beforeEach(() => {
    mocks.revalidatePath.mockReset();
    mocks.requireAccountId.mockReset();
    mocks.requireUserId.mockReset();
    mocks.requireWritableBilling.mockReset();
    mocks.createClient.mockReset();
    mocks.requireAccountId.mockResolvedValue(ACCOUNT_ID);
    mocks.requireUserId.mockResolvedValue(USER_ID);
    mocks.requireWritableBilling.mockResolvedValue(undefined);
  });

  test("rejects an empty title before account lookup", async () => {
    const supabase = createSupabaseMock();
    mocks.createClient.mockResolvedValue(supabase);

    await expect(createLeadTask(LEAD_ID, createInput({ title: "" }))).rejects.toThrow(
      "Title is required",
    );

    expect(mocks.requireAccountId).not.toHaveBeenCalled();
    expect(supabase.inserts).toEqual([]);
  });

  test("throws Lead not found when the lead is missing or deleted and does not insert a task or activity", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("leads", "select", { data: null, error: null });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(createLeadTask(LEAD_ID, createInput())).rejects.toThrow(
      "Lead not found",
    );

    expect(supabase.isFilters).toContainEqual(["leads", "deleted_at", null]);
    expect(supabase.inserts).toEqual([]);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  test("falls empty assignedUserId back to the current user, stores whitespace description as null, and records task_created", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("leads", "select", { data: { id: LEAD_ID }, error: null });
    supabase.setResult("lead_tasks", "insert", {
      data: { id: TASK_ID },
      error: null,
    });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(
      createLeadTask(
        LEAD_ID,
        createInput({
          assignedUserId: "",
          description: "   ",
        }),
      ),
    ).resolves.toEqual({ taskId: TASK_ID });

    expect(mocks.requireWritableBilling).toHaveBeenCalledWith(ACCOUNT_ID);
    expect(supabase.inserts).toEqual([
      {
        table: "lead_tasks",
        payload: {
          account_id: ACCOUNT_ID,
          lead_id: LEAD_ID,
          title: "Call back",
          description: null,
          due_at: DUE_AT,
          priority: "normal",
          assigned_user_id: USER_ID,
          created_by_user_id: USER_ID,
        },
      },
      {
        table: "activities",
        payload: {
          account_id: ACCOUNT_ID,
          lead_id: LEAD_ID,
          type: "task_created",
          actor_user_id: USER_ID,
          payload: {
            task_id: TASK_ID,
            title: "Call back",
            due_at: DUE_AT,
          },
        },
      },
    ]);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/");
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/leads/${LEAD_ID}`);
  });
});

describe("completeLeadTask", () => {
  beforeEach(() => {
    mocks.revalidatePath.mockReset();
    mocks.requireAccountId.mockReset();
    mocks.requireUserId.mockReset();
    mocks.requireWritableBilling.mockReset();
    mocks.createClient.mockReset();
    mocks.requireAccountId.mockResolvedValue(ACCOUNT_ID);
    mocks.requireUserId.mockResolvedValue(USER_ID);
    mocks.requireWritableBilling.mockResolvedValue(undefined);
  });

  test("rejects an empty nextTitle before account lookup", async () => {
    const supabase = createSupabaseMock();
    mocks.createClient.mockResolvedValue(supabase);

    await expect(
      completeLeadTask(TASK_ID, completeInput({ nextTitle: "" })),
    ).rejects.toThrow("Next step is required");

    expect(mocks.requireAccountId).not.toHaveBeenCalled();
    expect(supabase.inserts).toEqual([]);
    expect(supabase.updates).toEqual([]);
  });

  test("throws Open task not found when the task is missing or already completed and does not insert the next task", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("lead_tasks", "select", { data: null, error: null });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(completeLeadTask(TASK_ID, completeInput())).rejects.toThrow(
      "Open task not found",
    );

    expect(supabase.isFilters).toContainEqual(["lead_tasks", "completed_at", null]);
    expect(supabase.inserts).toEqual([]);
    expect(supabase.updates).toEqual([]);
  });

  test("inserts the next task, completes the current one, and records task_completed then task_created", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("lead_tasks", "select", {
      data: { id: TASK_ID, lead_id: LEAD_ID, title: "Call back" },
      error: null,
    });
    supabase.setResult("lead_tasks", "insert", {
      data: { id: NEXT_TASK_ID },
      error: null,
    });
    supabase.setResult("lead_tasks", "update", { data: null, error: null });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(
      completeLeadTask(
        TASK_ID,
        completeInput({
          completionNote: "  left voicemail  ",
          nextDescription: "   ",
          nextAssignedUserId: "",
        }),
      ),
    ).resolves.toEqual({ nextTaskId: NEXT_TASK_ID });

    expect(mocks.requireWritableBilling).toHaveBeenCalledWith(ACCOUNT_ID);
    expect(supabase.inserts[0]).toEqual({
      table: "lead_tasks",
      payload: {
        account_id: ACCOUNT_ID,
        lead_id: LEAD_ID,
        title: "Send offer",
        description: null,
        due_at: NEXT_DUE_AT,
        priority: "high",
        assigned_user_id: USER_ID,
        created_by_user_id: USER_ID,
      },
    });
    expect(supabase.updates).toHaveLength(1);
    expect(supabase.updates[0]?.table).toBe("lead_tasks");
    expect(supabase.updates[0]?.eqs).toEqual([
      ["id", TASK_ID],
      ["account_id", ACCOUNT_ID],
    ]);
    const completePayload = supabase.updates[0]?.payload as {
      completed_at: string;
      completed_by_user_id: string;
      completion_note: string | null;
      next_task_id: string;
    };
    expect(completePayload).toEqual(
      expect.objectContaining({
        completed_by_user_id: USER_ID,
        completion_note: "left voicemail",
        next_task_id: NEXT_TASK_ID,
      }),
    );
    expect(new Date(completePayload.completed_at).toISOString()).toBe(
      completePayload.completed_at,
    );
    expect(supabase.inserts[1]).toEqual({
      table: "activities",
      payload: [
        {
          account_id: ACCOUNT_ID,
          lead_id: LEAD_ID,
          type: "task_completed",
          actor_user_id: USER_ID,
          payload: {
            task_id: TASK_ID,
            title: "Call back",
            next_task_id: NEXT_TASK_ID,
          },
        },
        {
          account_id: ACCOUNT_ID,
          lead_id: LEAD_ID,
          type: "task_created",
          actor_user_id: USER_ID,
          payload: {
            task_id: NEXT_TASK_ID,
            title: "Send offer",
            due_at: NEXT_DUE_AT,
            source: "next_step",
          },
        },
      ],
    });
  });

  test("does not update the current task when the next-task insert fails", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("lead_tasks", "select", {
      data: { id: TASK_ID, lead_id: LEAD_ID, title: "Call back" },
      error: null,
    });
    supabase.setResult("lead_tasks", "insert", {
      data: null,
      error: { message: "next insert failed" },
    });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(completeLeadTask(TASK_ID, completeInput())).rejects.toThrow(
      "next insert failed",
    );

    expect(supabase.updates).toEqual([]);
    expect(supabase.inserts.map((row) => row.table)).toEqual(["lead_tasks"]);
  });
});
