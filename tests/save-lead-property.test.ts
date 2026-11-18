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

import { saveLeadProperty } from "@/lib/actions/leads";

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "user-1";
const LEAD_ID = "lead-1";

type QueryResult = { data: unknown; error: unknown };

function createSupabaseMock() {
  const inserts: Array<{ table: string; payload: unknown }> = [];
  const upserts: Array<{
    table: string;
    payload: unknown;
    options: unknown;
  }> = [];
  const fromTables: string[] = [];
  const isFilters: Array<[string, string, unknown]> = [];
  const singleResults: Record<string, QueryResult> = {};
  const upsertResults: Record<string, QueryResult> = {
    lead_properties: { data: null, error: null },
  };

  function from(table: string) {
    fromTables.push(table);
    let op: "select" | "insert" | "upsert" = "select";

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
      upsert(payload: unknown, options: unknown) {
        op = "upsert";
        upserts.push({ table, payload, options });
        return builder;
      },
      single: async () => singleResults[table] ?? { data: null, error: null },
      then(
        onFulfilled: (value: QueryResult) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) {
        if (op === "upsert") {
          return Promise.resolve(
            upsertResults[table] ?? { data: null, error: null },
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
    upserts,
    fromTables,
    isFilters,
    setSingle(table: string, result: QueryResult) {
      singleResults[table] = result;
    },
    setUpsertResult(table: string, result: QueryResult) {
      upsertResults[table] = result;
    },
  };
}

describe("saveLeadProperty", () => {
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

  test("throws Lead not found when the lead single() returns null and does not upsert or insert activity", async () => {
    const supabase = createSupabaseMock();
    supabase.setSingle("leads", { data: null, error: null });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(
      saveLeadProperty(LEAD_ID, { city: "Austin" }),
    ).rejects.toThrow("Lead not found");

    expect(supabase.upserts).toEqual([]);
    expect(supabase.inserts).toEqual([]);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  test("throws the lead query error message and does not upsert or insert activity", async () => {
    const supabase = createSupabaseMock();
    supabase.setSingle("leads", {
      data: null,
      error: { message: "lead query failed" },
    });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(
      saveLeadProperty(LEAD_ID, { city: "Austin" }),
    ).rejects.toThrow("lead query failed");

    expect(supabase.upserts).toEqual([]);
    expect(supabase.inserts).toEqual([]);
  });

  test("rejects an invalid contractStatus before upsert", async () => {
    const supabase = createSupabaseMock();
    mocks.createClient.mockResolvedValue(supabase);

    await expect(
      saveLeadProperty(LEAD_ID, {
        contractStatus: "Under Contract" as never,
      }),
    ).rejects.toThrow();

    expect(mocks.requireAccountId).not.toHaveBeenCalled();
    expect(supabase.upserts).toEqual([]);
    expect(supabase.inserts).toEqual([]);
  });

  test("upserts trimmed optional fields, stores under_contract, and records a system note", async () => {
    const supabase = createSupabaseMock();
    supabase.setSingle("leads", { data: { id: LEAD_ID }, error: null });
    mocks.createClient.mockResolvedValue(supabase);

    await saveLeadProperty(LEAD_ID, {
      city: "  Austin  ",
      state: "   ",
      bedrooms: "",
      bathrooms: "3",
      contractStatus: "under_contract",
    });

    expect(mocks.requireBillingCapability).toHaveBeenCalledWith(
      ACCOUNT_ID,
      "pipeline",
    );
    expect(supabase.isFilters).toContainEqual(["leads", "deleted_at", null]);
    expect(supabase.upserts).toHaveLength(1);
    expect(supabase.upserts[0]?.table).toBe("lead_properties");
    expect(supabase.upserts[0]?.options).toEqual({
      onConflict: "account_id,lead_id",
    });
    expect(supabase.upserts[0]?.payload).toEqual(
      expect.objectContaining({
        account_id: ACCOUNT_ID,
        lead_id: LEAD_ID,
        city: "Austin",
        state: null,
        bedrooms: null,
        bathrooms: 3,
        contract_status: "under_contract",
      }),
    );
    const payload = supabase.upserts[0]?.payload as { updated_at: string };
    expect(new Date(payload.updated_at).toISOString()).toBe(payload.updated_at);
    expect(supabase.inserts).toEqual([
      {
        table: "activities",
        payload: {
          account_id: ACCOUNT_ID,
          lead_id: LEAD_ID,
          type: "note_added",
          actor_user_id: USER_ID,
          payload: {
            note: "Property and contract details updated.",
            system: true,
          },
        },
      },
    ]);
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/leads/${LEAD_ID}`);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/pipeline");
  });

  test("throws the property upsert error and does not insert activity", async () => {
    const supabase = createSupabaseMock();
    supabase.setSingle("leads", { data: { id: LEAD_ID }, error: null });
    supabase.setUpsertResult("lead_properties", {
      data: null,
      error: { message: "upsert failed" },
    });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(
      saveLeadProperty(LEAD_ID, { city: "Austin" }),
    ).rejects.toThrow("upsert failed");

    expect(supabase.inserts).toEqual([]);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
