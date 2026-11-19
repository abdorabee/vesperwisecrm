import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requireAccountId: vi.fn(),
  requireClientContext: vi.fn(),
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
  requireClientContext: mocks.requireClientContext,
  requireUserId: mocks.requireUserId,
}));

vi.mock("@/lib/billing/access", () => ({
  requireWritableBilling: mocks.requireWritableBilling,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

import {
  addLeadClientComment,
  setClientInterest,
} from "@/lib/actions/portal";

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "user-1";
const LEAD_ID = "lead-1";
const CLIENT_ID = "client-1";

type QueryResult = { data: unknown; error: unknown };

function createSupabaseMock() {
  const inserts: Array<{ table: string; payload: unknown }> = [];
  const fromTables: string[] = [];
  const rpcCalls: Array<{ fn: string; args: unknown }> = [];
  const defaults: Record<string, QueryResult> = {};
  const rpcResults: Record<string, QueryResult> = {};

  function key(table: string, op: string) {
    return `${table}:${op}`;
  }

  function take(table: string, op: string): QueryResult {
    return defaults[key(table, op)] ?? { data: null, error: null };
  }

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

  async function rpc(fn: string, args: unknown) {
    rpcCalls.push({ fn, args });
    return rpcResults[fn] ?? { data: null, error: null };
  }

  return {
    from,
    rpc,
    inserts,
    fromTables,
    rpcCalls,
    setResult(table: string, op: string, result: QueryResult) {
      defaults[key(table, op)] = result;
    },
    setRpc(fn: string, result: QueryResult) {
      rpcResults[fn] = result;
    },
  };
}

describe("addLeadClientComment", () => {
  beforeEach(() => {
    mocks.revalidatePath.mockReset();
    mocks.requireAccountId.mockReset();
    mocks.requireClientContext.mockReset();
    mocks.requireUserId.mockReset();
    mocks.requireWritableBilling.mockReset();
    mocks.createClient.mockReset();
    mocks.requireUserId.mockResolvedValue(USER_ID);
    mocks.requireWritableBilling.mockResolvedValue(undefined);
  });

  test("rejects an empty body before looking up the user", async () => {
    const supabase = createSupabaseMock();
    mocks.createClient.mockResolvedValue(supabase);

    await expect(addLeadClientComment(LEAD_ID, { body: "" })).rejects.toThrow(
      "Comment can't be empty",
    );

    expect(mocks.requireUserId).not.toHaveBeenCalled();
    expect(supabase.inserts).toEqual([]);
  });

  test("throws when the lead is missing and does not insert a comment or check billing", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("leads", "select", { data: null, error: null });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(
      addLeadClientComment(LEAD_ID, { body: "Looks good" }),
    ).rejects.toThrow("Lead is not assigned to a client");

    expect(supabase.inserts).toEqual([]);
    expect(mocks.requireWritableBilling).not.toHaveBeenCalled();
  });

  test("throws when client_id is null and does not insert a comment or check billing", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("leads", "select", {
      data: { account_id: ACCOUNT_ID, client_id: null },
      error: null,
    });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(
      addLeadClientComment(LEAD_ID, { body: "Looks good" }),
    ).rejects.toThrow("Lead is not assigned to a client");

    expect(supabase.inserts).toEqual([]);
    expect(mocks.requireWritableBilling).not.toHaveBeenCalled();
  });

  test("inserts a comment using the lead account and checks billing on that account", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("leads", "select", {
      data: { account_id: ACCOUNT_ID, client_id: CLIENT_ID },
      error: null,
    });
    mocks.createClient.mockResolvedValue(supabase);

    await addLeadClientComment(LEAD_ID, { body: "Looks good" });

    expect(mocks.requireWritableBilling).toHaveBeenCalledWith(ACCOUNT_ID);
    expect(supabase.inserts).toEqual([
      {
        table: "lead_client_comments",
        payload: {
          account_id: ACCOUNT_ID,
          lead_id: LEAD_ID,
          client_id: CLIENT_ID,
          author_user_id: USER_ID,
          body: "Looks good",
        },
      },
    ]);
  });
});

describe("setClientInterest", () => {
  beforeEach(() => {
    mocks.revalidatePath.mockReset();
    mocks.requireAccountId.mockReset();
    mocks.requireClientContext.mockReset();
    mocks.requireUserId.mockReset();
    mocks.requireWritableBilling.mockReset();
    mocks.createClient.mockReset();
    mocks.requireClientContext.mockResolvedValue({
      accountId: ACCOUNT_ID,
      clientId: CLIENT_ID,
    });
    mocks.requireWritableBilling.mockResolvedValue(undefined);
  });

  test("rejects an invalid status before looking up client context", async () => {
    const supabase = createSupabaseMock();
    mocks.createClient.mockResolvedValue(supabase);

    await expect(
      setClientInterest(LEAD_ID, { status: "pending" as never }),
    ).rejects.toThrow();

    expect(mocks.requireClientContext).not.toHaveBeenCalled();
    expect(mocks.requireAccountId).not.toHaveBeenCalled();
    expect(supabase.rpcCalls).toEqual([]);
  });

  test("uses requireClientContext and calls set_client_lead_interest", async () => {
    const supabase = createSupabaseMock();
    supabase.setRpc("set_client_lead_interest", { data: null, error: null });
    mocks.createClient.mockResolvedValue(supabase);

    await setClientInterest(LEAD_ID, { status: "interested" });

    expect(mocks.requireClientContext).toHaveBeenCalled();
    expect(mocks.requireAccountId).not.toHaveBeenCalled();
    expect(supabase.rpcCalls).toEqual([
      {
        fn: "set_client_lead_interest",
        args: { p_lead_id: LEAD_ID, p_status: "interested" },
      },
    ]);
  });

  test("throws the rpc error", async () => {
    const supabase = createSupabaseMock();
    supabase.setRpc("set_client_lead_interest", {
      data: null,
      error: { message: "rpc failed" },
    });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(
      setClientInterest(LEAD_ID, { status: "declined" }),
    ).rejects.toThrow("rpc failed");
  });
});
