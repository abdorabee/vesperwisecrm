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

import { addTagToLead } from "@/lib/actions/tags";

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "user-1";
const LEAD_ID = "lead-1";
const TAG_ID = "tag-1";
const TAG_NAME = "Hot";

type QueryResult = { data: unknown; error: unknown };

function createSupabaseMock() {
  const inserts: Array<{ table: string; payload: unknown }> = [];
  const fromTables: string[] = [];
  const maybeSingleResults: Record<string, QueryResult> = {};
  const insertResults: Record<string, QueryResult> = {
    lead_tags: { data: [{ lead_id: LEAD_ID }], error: null },
  };

  function from(table: string) {
    fromTables.push(table);
    let op: "select" | "insert" | "update" = "select";

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
      maybeSingle: async () =>
        maybeSingleResults[table] ?? { data: null, error: null },
      then(
        onFulfilled: (value: QueryResult) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) {
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
    fromTables,
    setMaybeSingle(table: string, result: QueryResult) {
      maybeSingleResults[table] = result;
    },
    setInsertResult(table: string, result: QueryResult) {
      insertResults[table] = result;
    },
  };
}

describe("addTagToLead", () => {
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

  test("throws when the lead is missing and does not insert or fire workflows", async () => {
    const supabase = createSupabaseMock();
    supabase.setMaybeSingle("leads", { data: null, error: null });
    supabase.setMaybeSingle("tags", { data: { id: TAG_ID }, error: null });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(addTagToLead(LEAD_ID, TAG_ID, TAG_NAME)).rejects.toThrow(
      "Lead or tag not found",
    );

    expect(supabase.inserts).toEqual([]);
    expect(mocks.runTriggeredWorkflows).not.toHaveBeenCalled();
  });

  test("throws when the tag is missing and does not insert or fire workflows", async () => {
    const supabase = createSupabaseMock();
    supabase.setMaybeSingle("leads", { data: { id: LEAD_ID }, error: null });
    supabase.setMaybeSingle("tags", { data: null, error: null });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(addTagToLead(LEAD_ID, TAG_ID, TAG_NAME)).rejects.toThrow(
      "Lead or tag not found",
    );

    expect(supabase.inserts).toEqual([]);
    expect(mocks.runTriggeredWorkflows).not.toHaveBeenCalled();
  });

  test("inserts lead_tags and a tag_added activity then fires tag_added workflows", async () => {
    const supabase = createSupabaseMock();
    supabase.setMaybeSingle("leads", { data: { id: LEAD_ID }, error: null });
    supabase.setMaybeSingle("tags", { data: { id: TAG_ID }, error: null });
    mocks.createClient.mockResolvedValue(supabase);

    await addTagToLead(LEAD_ID, TAG_ID, TAG_NAME);

    expect(mocks.requireWritableBilling).toHaveBeenCalledWith(ACCOUNT_ID);
    expect(supabase.inserts).toEqual([
      {
        table: "lead_tags",
        payload: {
          account_id: ACCOUNT_ID,
          lead_id: LEAD_ID,
          tag_id: TAG_ID,
        },
      },
      {
        table: "activities",
        payload: {
          account_id: ACCOUNT_ID,
          lead_id: LEAD_ID,
          type: "tag_added",
          actor_user_id: USER_ID,
          payload: { tag_name: TAG_NAME },
        },
      },
    ]);
    expect(mocks.runTriggeredWorkflows).toHaveBeenCalledTimes(1);
    expect(mocks.runTriggeredWorkflows).toHaveBeenCalledWith(
      supabase,
      ACCOUNT_ID,
      "tag_added",
      { leadId: LEAD_ID, tagId: TAG_ID },
    );
  });

  test("throws when lead_tags insert matches no rows and does not fire workflows", async () => {
    const supabase = createSupabaseMock();
    supabase.setMaybeSingle("leads", { data: { id: LEAD_ID }, error: null });
    supabase.setMaybeSingle("tags", { data: { id: TAG_ID }, error: null });
    supabase.setInsertResult("lead_tags", { data: [], error: null });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(addTagToLead(LEAD_ID, TAG_ID, TAG_NAME)).rejects.toThrow(
      "Could not add tag",
    );

    expect(supabase.inserts.map((row) => row.table)).toEqual(["lead_tags"]);
    expect(mocks.runTriggeredWorkflows).not.toHaveBeenCalled();
  });
});
