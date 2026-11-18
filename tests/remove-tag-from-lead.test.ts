import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requireAccountId: vi.fn(),
  requireUserId: vi.fn(),
  requireWritableBilling: vi.fn(),
  runTriggeredWorkflows: vi.fn(),
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

vi.mock("@/lib/workflows/engine", () => ({
  runTriggeredWorkflows: mocks.runTriggeredWorkflows,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

import { createTag, removeTagFromLead } from "@/lib/actions/tags";

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "user-1";
const LEAD_ID = "lead-1";
const TAG_ID = "tag-1";
const TAG_NAME = "Hot";

type QueryResult = { data: unknown; error: unknown };

function createSupabaseMock() {
  const inserts: Array<{ table: string; payload: unknown }> = [];
  const deletes: Array<{
    table: string;
    eqs: Array<[string, unknown]>;
  }> = [];
  const fromTables: string[] = [];
  const maybeSingleResults: Record<string, QueryResult> = {};
  const insertResults: Record<string, QueryResult> = {};
  const deleteResults: Record<string, QueryResult> = {
    lead_tags: { data: [{ lead_id: LEAD_ID }], error: null },
  };

  function from(table: string) {
    fromTables.push(table);
    let op: "select" | "insert" | "delete" = "select";
    const eqs: Array<[string, unknown]> = [];

    const builder = {
      select() {
        return builder;
      },
      eq(column: string, value: unknown) {
        eqs.push([column, value]);
        return builder;
      },
      ilike() {
        return builder;
      },
      insert(payload: unknown) {
        op = "insert";
        inserts.push({ table, payload });
        return builder;
      },
      delete() {
        op = "delete";
        deletes.push({ table, eqs });
        return builder;
      },
      maybeSingle: async () =>
        maybeSingleResults[table] ?? { data: null, error: null },
      single: async () =>
        insertResults[table] ?? { data: null, error: null },
      then(
        onFulfilled: (value: QueryResult) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) {
        if (op === "delete") {
          return Promise.resolve(
            deleteResults[table] ?? { data: [], error: null },
          ).then(onFulfilled, onRejected);
        }
        return Promise.resolve(
          insertResults[table] ?? { data: null, error: null },
        ).then(onFulfilled, onRejected);
      },
    };

    return builder;
  }

  return {
    from,
    inserts,
    deletes,
    fromTables,
    setMaybeSingle(table: string, result: QueryResult) {
      maybeSingleResults[table] = result;
    },
    setDeleteResult(table: string, result: QueryResult) {
      deleteResults[table] = result;
    },
  };
}

describe("removeTagFromLead", () => {
  beforeEach(() => {
    mocks.revalidatePath.mockReset();
    mocks.requireAccountId.mockReset();
    mocks.requireUserId.mockReset();
    mocks.requireWritableBilling.mockReset();
    mocks.runTriggeredWorkflows.mockReset();
    mocks.createClient.mockReset();
    mocks.requireAccountId.mockResolvedValue(ACCOUNT_ID);
    mocks.requireUserId.mockResolvedValue(USER_ID);
    mocks.requireWritableBilling.mockResolvedValue(undefined);
    mocks.runTriggeredWorkflows.mockResolvedValue(undefined);
  });

  test("requires writable billing for the account", async () => {
    const supabase = createSupabaseMock();
    mocks.createClient.mockResolvedValue(supabase);

    await removeTagFromLead(LEAD_ID, TAG_ID, TAG_NAME);

    expect(mocks.requireWritableBilling).toHaveBeenCalledWith(ACCOUNT_ID);
  });

  test("deletes the account-scoped lead tag, records activity, and does not fire workflows", async () => {
    const supabase = createSupabaseMock();
    mocks.createClient.mockResolvedValue(supabase);

    await removeTagFromLead(LEAD_ID, TAG_ID, TAG_NAME);

    expect(supabase.deletes).toEqual([
      {
        table: "lead_tags",
        eqs: [
          ["lead_id", LEAD_ID],
          ["tag_id", TAG_ID],
          ["account_id", ACCOUNT_ID],
        ],
      },
    ]);
    expect(supabase.inserts).toEqual([
      {
        table: "activities",
        payload: {
          account_id: ACCOUNT_ID,
          lead_id: LEAD_ID,
          type: "tag_removed",
          actor_user_id: USER_ID,
          payload: { tag_name: TAG_NAME },
        },
      },
    ]);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/pipeline");
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/leads/${LEAD_ID}`);
    expect(mocks.runTriggeredWorkflows).not.toHaveBeenCalled();
  });

  test("throws when the delete matches no rows and does not insert or fire workflows", async () => {
    const supabase = createSupabaseMock();
    supabase.setDeleteResult("lead_tags", { data: [], error: null });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(
      removeTagFromLead(LEAD_ID, TAG_ID, TAG_NAME),
    ).rejects.toThrow("Tag not found on this lead");

    expect(supabase.inserts).toEqual([]);
    expect(mocks.runTriggeredWorkflows).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  test("throws the delete error message and does not insert or fire workflows", async () => {
    const supabase = createSupabaseMock();
    supabase.setDeleteResult("lead_tags", {
      data: null,
      error: { message: "delete failed" },
    });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(
      removeTagFromLead(LEAD_ID, TAG_ID, TAG_NAME),
    ).rejects.toThrow("delete failed");

    expect(supabase.inserts).toEqual([]);
    expect(mocks.runTriggeredWorkflows).not.toHaveBeenCalled();
  });
});

describe("createTag", () => {
  beforeEach(() => {
    mocks.revalidatePath.mockReset();
    mocks.requireAccountId.mockReset();
    mocks.requireWritableBilling.mockReset();
    mocks.createClient.mockReset();
    mocks.requireAccountId.mockResolvedValue(ACCOUNT_ID);
    mocks.requireWritableBilling.mockResolvedValue(undefined);
  });

  test("rejects an empty name", async () => {
    await expect(createTag("")).rejects.toThrow("Name is required");
    expect(mocks.requireAccountId).not.toHaveBeenCalled();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  test("returns an existing tag matched by ilike without inserting", async () => {
    const existing = {
      id: TAG_ID,
      account_id: ACCOUNT_ID,
      name: TAG_NAME,
      color: null,
    };
    const supabase = createSupabaseMock();
    supabase.setMaybeSingle("tags", { data: existing, error: null });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(createTag(TAG_NAME)).resolves.toEqual(existing);

    expect(supabase.inserts).toEqual([]);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
