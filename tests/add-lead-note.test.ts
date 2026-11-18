import { beforeEach, describe, expect, test, vi } from "vitest";

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

import { addLeadNote } from "@/lib/actions/leads";

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "user-1";
const LEAD_ID = "lead-1";

type QueryResult = { data: unknown; error: unknown };

function createSupabaseMock() {
  const inserts: Array<{ table: string; payload: unknown }> = [];
  const fromTables: string[] = [];
  const isFilters: Array<[string, string, unknown]> = [];
  const singleResults: Record<string, QueryResult> = {};
  const insertResults: Record<string, QueryResult> = {
    activities: { data: null, error: null },
  };

  function from(table: string) {
    fromTables.push(table);
    let op: "select" | "insert" = "select";

    const builder = {
      select() {
        return builder;
      },
      eq() {
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
      single: async () => singleResults[table] ?? { data: null, error: null },
      then(
        onFulfilled: (value: QueryResult) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) {
        if (op === "insert") {
          return Promise.resolve(
            insertResults[table] ?? { data: null, error: null },
          ).then(onFulfilled, onRejected);
        }
        return Promise.resolve({ data: null, error: null }).then(
          onFulfilled,
          onRejected,
        );
      },
    };

    return builder;
  }

  return {
    from,
    inserts,
    fromTables,
    isFilters,
    setSingle(table: string, result: QueryResult) {
      singleResults[table] = result;
    },
    setInsertResult(table: string, result: QueryResult) {
      insertResults[table] = result;
    },
  };
}

describe("addLeadNote", () => {
  beforeEach(() => {
    mocks.revalidatePath.mockReset();
    mocks.requireAccountId.mockReset();
    mocks.requireUserId.mockReset();
    mocks.requireBillingCapability.mockReset();
    mocks.createClient.mockReset();
    mocks.requireAccountId.mockResolvedValue(ACCOUNT_ID);
    mocks.requireUserId.mockResolvedValue(USER_ID);
    mocks.requireBillingCapability.mockResolvedValue(undefined);
  });

  test("rejects an empty note", async () => {
    await expect(addLeadNote(LEAD_ID, { note: "" })).rejects.toThrow(
      "Note is required",
    );
    expect(mocks.requireAccountId).not.toHaveBeenCalled();
  });

  test("rejects a whitespace-only note", async () => {
    await expect(addLeadNote(LEAD_ID, { note: "   " })).rejects.toThrow(
      "Note is required",
    );
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  test("rejects a note longer than 5000 characters", async () => {
    await expect(
      addLeadNote(LEAD_ID, { note: "a".repeat(5001) }),
    ).rejects.toThrow("Note is too long");
  });

  test("throws Lead not found when the lead is missing and does not insert", async () => {
    const supabase = createSupabaseMock();
    supabase.setSingle("leads", { data: null, error: null });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(addLeadNote(LEAD_ID, { note: "hello" })).rejects.toThrow(
      "Lead not found",
    );

    expect(supabase.isFilters).toContainEqual(["leads", "deleted_at", null]);
    expect(supabase.inserts).toEqual([]);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  test("throws the insert error message", async () => {
    const supabase = createSupabaseMock();
    supabase.setSingle("leads", { data: { id: LEAD_ID }, error: null });
    supabase.setInsertResult("activities", {
      data: null,
      error: { message: "insert failed" },
    });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(addLeadNote(LEAD_ID, { note: "hello" })).rejects.toThrow(
      "insert failed",
    );

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  test("inserts a trimmed note_added activity and revalidates only the lead path", async () => {
    const supabase = createSupabaseMock();
    supabase.setSingle("leads", { data: { id: LEAD_ID }, error: null });
    mocks.createClient.mockResolvedValue(supabase);

    await addLeadNote(LEAD_ID, { note: "  hello  " });

    expect(mocks.requireBillingCapability).toHaveBeenCalledWith(
      ACCOUNT_ID,
      "pipeline",
    );
    expect(supabase.inserts).toEqual([
      {
        table: "activities",
        payload: {
          account_id: ACCOUNT_ID,
          lead_id: LEAD_ID,
          type: "note_added",
          actor_user_id: USER_ID,
          payload: { note: "hello" },
        },
      },
    ]);
    expect(mocks.revalidatePath).toHaveBeenCalledTimes(1);
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/leads/${LEAD_ID}`);
    expect(mocks.revalidatePath).not.toHaveBeenCalledWith("/pipeline");
  });
});
