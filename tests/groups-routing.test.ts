import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requireAccountId: vi.fn(),
  requireAdminAccountId: vi.fn(),
  requireBillingCapability: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/supabase/account", () => ({
  requireAccountId: mocks.requireAccountId,
  requireAdminAccountId: mocks.requireAdminAccountId,
}));

vi.mock("@/lib/billing/access", () => ({
  requireBillingCapability: mocks.requireBillingCapability,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

import {
  assignLeadToGroup,
  manualAssignLead,
  releaseLead,
  saveGroup,
} from "@/lib/actions/groups";

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const LEAD_ID = "lead-1";
const GROUP_ID = "group-1";
const MEMBER_A = "22222222-2222-4222-8222-222222222222";
const MEMBER_B = "33333333-3333-4333-8333-333333333333";

type QueryResult = { data: unknown; error: unknown; count?: number | null };

function createSupabaseMock() {
  const inserts: Array<{ table: string; payload: unknown }> = [];
  const updates: Array<{
    table: string;
    payload: unknown;
    eqs: Array<[string, unknown]>;
  }> = [];
  const deletes: Array<{
    table: string;
    eqs: Array<[string, unknown]>;
  }> = [];
  const fromTables: string[] = [];
  const inFilters: Array<[string, string, unknown]> = [];
  const rpcCalls: Array<{ fn: string; args: unknown }> = [];
  const queues: Record<string, QueryResult[]> = {};
  const defaults: Record<string, QueryResult> = {};
  const rpcResults: Record<string, QueryResult> = {};

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
    const eqs: Array<[string, unknown]> = [];

    const builder = {
      select() {
        return builder;
      },
      eq(column: string, value: unknown) {
        eqs.push([column, value]);
        return builder;
      },
      is() {
        return builder;
      },
      in(column: string, values: unknown) {
        inFilters.push([table, column, values]);
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
      delete() {
        op = "delete";
        deletes.push({ table, eqs });
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
    updates,
    deletes,
    fromTables,
    inFilters,
    rpcCalls,
    setResult(table: string, op: string, result: QueryResult) {
      defaults[key(table, op)] = result;
    },
    setRpc(fn: string, result: QueryResult) {
      rpcResults[fn] = result;
    },
  };
}

describe("saveGroup", () => {
  beforeEach(() => {
    mocks.revalidatePath.mockReset();
    mocks.requireAccountId.mockReset();
    mocks.requireAdminAccountId.mockReset();
    mocks.requireBillingCapability.mockReset();
    mocks.createClient.mockReset();
    mocks.requireAccountId.mockResolvedValue(ACCOUNT_ID);
    mocks.requireBillingCapability.mockResolvedValue(undefined);
  });

  test("throws when a member is not in the workspace and does not insert lead_groups", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("account_members", "select", {
      data: [{ user_id: MEMBER_A }],
      error: null,
    });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(
      saveGroup({
        name: "West",
        members: [
          { userId: MEMBER_A, weight: "1" },
          { userId: MEMBER_B, weight: "2" },
        ],
      }),
    ).rejects.toThrow("A routing group member is not in this workspace");

    expect(supabase.inFilters).toContainEqual([
      "account_members",
      "user_id",
      [MEMBER_A, MEMBER_B],
    ]);
    expect(supabase.inserts.filter((row) => row.table === "lead_groups")).toEqual(
      [],
    );
  });

  test("skips account_members lookup for empty members and still creates the group", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("lead_groups", "insert", {
      data: { id: GROUP_ID },
      error: null,
    });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(saveGroup({ name: "West", members: [] })).resolves.toEqual({
      groupId: GROUP_ID,
    });

    expect(supabase.fromTables).not.toContain("account_members");
    expect(supabase.inserts).toEqual([
      {
        table: "lead_groups",
        payload: { account_id: ACCOUNT_ID, name: "West" },
      },
    ]);
  });

  test("throws Routing group not found on an empty update before deleting members", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("lead_groups", "update", { data: [], error: null });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(
      saveGroup({ name: "West", members: [] }, GROUP_ID),
    ).rejects.toThrow("Routing group not found");

    expect(supabase.deletes).toEqual([]);
  });
});

describe("manualAssignLead / releaseLead", () => {
  beforeEach(() => {
    mocks.revalidatePath.mockReset();
    mocks.requireAccountId.mockReset();
    mocks.requireAdminAccountId.mockReset();
    mocks.requireBillingCapability.mockReset();
    mocks.createClient.mockReset();
    mocks.requireAccountId.mockResolvedValue(ACCOUNT_ID);
    mocks.requireAdminAccountId.mockResolvedValue(ACCOUNT_ID);
    mocks.requireBillingCapability.mockResolvedValue(undefined);
  });

  test("requires the routing billing capability", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("account_members", "select", {
      data: { max_open_leads: null },
      error: null,
    });
    supabase.setResult("leads", "update", {
      data: [{ id: LEAD_ID }],
      error: null,
    });
    mocks.createClient.mockResolvedValue(supabase);

    await manualAssignLead(LEAD_ID, MEMBER_A);

    expect(mocks.requireBillingCapability).toHaveBeenCalledWith(
      ACCOUNT_ID,
      "routing",
    );
  });

  test("throws Team member not found and does not update leads or call the admin gate", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("account_members", "select", {
      data: null,
      error: null,
    });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(manualAssignLead(LEAD_ID, MEMBER_A)).rejects.toThrow(
      "Team member not found",
    );

    expect(supabase.updates).toEqual([]);
    expect(mocks.requireAdminAccountId).not.toHaveBeenCalled();
  });

  test("throws when the member is at their open-lead cap without calling the admin gate", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("account_members", "select", {
      data: { max_open_leads: 2 },
      error: null,
    });
    supabase.setResult("leads", "select", {
      data: null,
      error: null,
      count: 2,
    });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(manualAssignLead(LEAD_ID, MEMBER_A)).rejects.toThrow(
      "This team member is at their open-lead cap",
    );

    expect(supabase.updates).toEqual([]);
    expect(mocks.requireAdminAccountId).not.toHaveBeenCalled();
  });

  test("requires admin then assigns owner_user_id and records lead_assigned", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("account_members", "select", {
      data: { max_open_leads: null },
      error: null,
    });
    supabase.setResult("leads", "update", {
      data: [{ id: LEAD_ID }],
      error: null,
    });
    mocks.createClient.mockResolvedValue(supabase);

    await manualAssignLead(LEAD_ID, MEMBER_A);

    expect(mocks.requireAdminAccountId).toHaveBeenCalledTimes(1);
    expect(supabase.updates).toEqual([
      {
        table: "leads",
        payload: { owner_user_id: MEMBER_A },
        eqs: [
          ["id", LEAD_ID],
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
          type: "lead_assigned",
          payload: { user_id: MEMBER_A },
        },
      },
    ]);
  });

  test("releaseLead skips member lookup, still requires admin, and records lead_unassigned", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("leads", "update", {
      data: [{ id: LEAD_ID }],
      error: null,
    });
    mocks.createClient.mockResolvedValue(supabase);

    await releaseLead(LEAD_ID);

    expect(supabase.fromTables).not.toContain("account_members");
    expect(mocks.requireBillingCapability).toHaveBeenCalledWith(
      ACCOUNT_ID,
      "routing",
    );
    expect(mocks.requireAdminAccountId).toHaveBeenCalledTimes(1);
    expect(supabase.updates[0]?.payload).toEqual({ owner_user_id: null });
    expect(supabase.inserts).toEqual([
      {
        table: "activities",
        payload: {
          account_id: ACCOUNT_ID,
          lead_id: LEAD_ID,
          type: "lead_unassigned",
          payload: {},
        },
      },
    ]);
  });

  test("throws Lead not found when the update matches no rows", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("leads", "update", { data: [], error: null });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(releaseLead(LEAD_ID)).rejects.toThrow("Lead not found");

    expect(mocks.requireAdminAccountId).toHaveBeenCalled();
    expect(supabase.inserts).toEqual([]);
  });
});

describe("assignLeadToGroup", () => {
  beforeEach(() => {
    mocks.revalidatePath.mockReset();
    mocks.requireAccountId.mockReset();
    mocks.requireAdminAccountId.mockReset();
    mocks.requireBillingCapability.mockReset();
    mocks.createClient.mockReset();
    mocks.requireAccountId.mockResolvedValue(ACCOUNT_ID);
    mocks.requireBillingCapability.mockResolvedValue(undefined);
  });

  test("throws when the lead is missing and does not call rpc", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("leads", "select", { data: null, error: null });
    supabase.setResult("lead_groups", "select", {
      data: { id: GROUP_ID },
      error: null,
    });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(assignLeadToGroup(LEAD_ID, GROUP_ID)).rejects.toThrow(
      "Lead or routing group not found",
    );

    expect(supabase.rpcCalls).toEqual([]);
  });

  test("throws when the group is missing and does not call rpc", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("leads", "select", { data: { id: LEAD_ID }, error: null });
    supabase.setResult("lead_groups", "select", { data: null, error: null });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(assignLeadToGroup(LEAD_ID, GROUP_ID)).rejects.toThrow(
      "Lead or routing group not found",
    );

    expect(supabase.rpcCalls).toEqual([]);
  });

  test("calls assign_lead_round_robin and returns assignedUserId", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("leads", "select", { data: { id: LEAD_ID }, error: null });
    supabase.setResult("lead_groups", "select", {
      data: { id: GROUP_ID },
      error: null,
    });
    supabase.setRpc("assign_lead_round_robin", {
      data: MEMBER_A,
      error: null,
    });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(assignLeadToGroup(LEAD_ID, GROUP_ID)).resolves.toEqual({
      assignedUserId: MEMBER_A,
    });

    expect(supabase.rpcCalls).toEqual([
      {
        fn: "assign_lead_round_robin",
        args: { p_lead_id: LEAD_ID, p_group_id: GROUP_ID },
      },
    ]);
  });
});
