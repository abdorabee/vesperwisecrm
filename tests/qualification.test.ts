import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requireAccountId: vi.fn(),
  requireUserId: vi.fn(),
  requireBillingCapability: vi.fn(),
  assignLeadToGroup: vi.fn(),
  runTriggeredWorkflows: vi.fn(),
  createLeadRecord: vi.fn(),
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

vi.mock("@/lib/actions/groups", () => ({
  assignLeadToGroup: mocks.assignLeadToGroup,
}));

vi.mock("@/lib/workflows/engine", () => ({
  runTriggeredWorkflows: mocks.runTriggeredWorkflows,
}));

vi.mock("@/lib/leads/create-lead", () => ({
  createLeadRecord: mocks.createLeadRecord,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

import {
  qualifyLead,
  rejectLead,
  requestLeadInfo,
} from "@/lib/actions/qualification";

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "user-1";
const LEAD_ID = "lead-1";
const GROUP_ID = "group-1";
const TASK_ID = "task-1";
const SUBMITTED_BY = "submitter-1";
const NOW = Date.parse("2026-11-19T10:00:00.000Z");

type QueryResult = { data: unknown; error: unknown };

function createSupabaseMock() {
  const inserts: Array<{ table: string; payload: unknown }> = [];
  const updates: Array<{
    table: string;
    payload: unknown;
    eqs: Array<[string, unknown]>;
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
    setResult(table: string, op: string, result: QueryResult) {
      defaults[key(table, op)] = result;
    },
  };
}

const COMPLETE_PROPERTY = {
  motivation: "Relocating",
  timeline: "30 days",
  asking_price: 250000,
  occupancy_status: "owner",
  condition: "fair",
};

describe("qualifyLead", () => {
  beforeEach(() => {
    mocks.revalidatePath.mockReset();
    mocks.requireAccountId.mockReset();
    mocks.requireUserId.mockReset();
    mocks.requireBillingCapability.mockReset();
    mocks.assignLeadToGroup.mockReset();
    mocks.createClient.mockReset();
    mocks.requireAccountId.mockResolvedValue(ACCOUNT_ID);
    mocks.requireUserId.mockResolvedValue(USER_ID);
    mocks.requireBillingCapability.mockResolvedValue(undefined);
    mocks.assignLeadToGroup.mockResolvedValue({ assignedUserId: USER_ID });
  });

  test("throws listing every missing field when the property row is null and does not update leads", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("lead_properties", "select", {
      data: null,
      error: null,
    });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(qualifyLead(LEAD_ID)).rejects.toThrow(
      "Add motivation, timeline, asking_price, occupancy_status, condition before qualifying this lead",
    );

    expect(supabase.updates).toEqual([]);
    expect(supabase.inserts).toEqual([]);
    expect(mocks.assignLeadToGroup).not.toHaveBeenCalled();
  });

  test("treats an empty string as missing and does not update leads", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("lead_properties", "select", {
      data: { ...COMPLETE_PROPERTY, motivation: "" },
      error: null,
    });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(qualifyLead(LEAD_ID)).rejects.toThrow(
      "Add motivation before qualifying this lead",
    );

    expect(supabase.updates).toEqual([]);
  });

  test("qualifies the lead, records lead_qualified, and skips routing when groupId is omitted", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("lead_properties", "select", {
      data: COMPLETE_PROPERTY,
      error: null,
    });
    mocks.createClient.mockResolvedValue(supabase);

    await qualifyLead(LEAD_ID);

    expect(supabase.updates).toHaveLength(1);
    expect(supabase.updates[0]?.table).toBe("leads");
    expect(supabase.updates[0]?.payload).toEqual(
      expect.objectContaining({
        qualification_status: "qualified",
        qualified_by_user_id: USER_ID,
      }),
    );
    const payload = supabase.updates[0]?.payload as { qualified_at: string };
    expect(new Date(payload.qualified_at).toISOString()).toBe(payload.qualified_at);
    expect(supabase.inserts).toEqual([
      {
        table: "activities",
        payload: {
          account_id: ACCOUNT_ID,
          lead_id: LEAD_ID,
          type: "lead_qualified",
          actor_user_id: USER_ID,
          payload: {},
        },
      },
    ]);
    expect(mocks.assignLeadToGroup).not.toHaveBeenCalled();
  });

  test("calls assignLeadToGroup after the lead update when groupId is provided", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("lead_properties", "select", {
      data: COMPLETE_PROPERTY,
      error: null,
    });
    mocks.createClient.mockResolvedValue(supabase);

    await qualifyLead(LEAD_ID, GROUP_ID);

    expect(supabase.updates).toHaveLength(1);
    expect(mocks.assignLeadToGroup).toHaveBeenCalledTimes(1);
    expect(mocks.assignLeadToGroup).toHaveBeenCalledWith(LEAD_ID, GROUP_ID);
  });
});

describe("rejectLead", () => {
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

  test("rejects an empty reason before account lookup", async () => {
    const supabase = createSupabaseMock();
    mocks.createClient.mockResolvedValue(supabase);

    await expect(rejectLead(LEAD_ID, { reason: "" })).rejects.toThrow(
      "A rejection reason is required",
    );

    expect(mocks.requireAccountId).not.toHaveBeenCalled();
    expect(supabase.updates).toEqual([]);
  });

  test("marks the lead rejected/lost and records lead_rejected with the reason", async () => {
    const supabase = createSupabaseMock();
    mocks.createClient.mockResolvedValue(supabase);

    await rejectLead(LEAD_ID, { reason: "Not motivated" });

    expect(supabase.updates).toEqual([
      {
        table: "leads",
        payload: {
          qualification_status: "rejected",
          rejection_reason: "Not motivated",
          status: "lost",
        },
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
          type: "lead_rejected",
          actor_user_id: USER_ID,
          payload: { reason: "Not motivated" },
        },
      },
    ]);
  });
});

describe("requestLeadInfo", () => {
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

  test("throws Lead not found when the lead is missing", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("leads", "select", { data: null, error: null });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(
      requestLeadInfo(LEAD_ID, { note: "Need occupancy" }),
    ).rejects.toThrow("Lead not found");

    expect(supabase.updates).toEqual([]);
    expect(supabase.inserts).toEqual([]);
  });

  test("sets needs_info, assigns the submitter a high-priority follow-up due in 24h, and records both activities", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("leads", "select", {
      data: { submitted_by_user_id: SUBMITTED_BY },
      error: null,
    });
    supabase.setResult("lead_tasks", "insert", {
      data: { id: TASK_ID },
      error: null,
    });
    mocks.createClient.mockResolvedValue(supabase);

    await requestLeadInfo(LEAD_ID, { note: "Need occupancy" });

    const dueAt = new Date(NOW + 24 * 60 * 60 * 1000).toISOString();
    expect(supabase.updates).toEqual([
      {
        table: "leads",
        payload: { qualification_status: "needs_info" },
        eqs: [
          ["id", LEAD_ID],
          ["account_id", ACCOUNT_ID],
        ],
      },
    ]);
    expect(supabase.inserts[0]).toEqual({
      table: "lead_tasks",
      payload: {
        account_id: ACCOUNT_ID,
        lead_id: LEAD_ID,
        title: "Get missing info back to the lead manager",
        description: "Need occupancy",
        due_at: dueAt,
        priority: "high",
        assigned_user_id: SUBMITTED_BY,
        created_by_user_id: USER_ID,
      },
    });
    expect(supabase.inserts[1]).toEqual({
      table: "activities",
      payload: [
        {
          account_id: ACCOUNT_ID,
          lead_id: LEAD_ID,
          type: "lead_needs_info",
          actor_user_id: USER_ID,
          payload: { note: "Need occupancy" },
        },
        {
          account_id: ACCOUNT_ID,
          lead_id: LEAD_ID,
          type: "task_created",
          actor_user_id: USER_ID,
          payload: {
            task_id: TASK_ID,
            title: "Get missing info back to the lead manager",
            due_at: dueAt,
          },
        },
      ],
    });
  });

  test("assigns the current user when submitted_by_user_id is null", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("leads", "select", {
      data: { submitted_by_user_id: null },
      error: null,
    });
    supabase.setResult("lead_tasks", "insert", {
      data: { id: TASK_ID },
      error: null,
    });
    mocks.createClient.mockResolvedValue(supabase);

    await requestLeadInfo(LEAD_ID, { note: "Need occupancy" });

    expect(supabase.inserts[0]?.payload).toEqual(
      expect.objectContaining({ assigned_user_id: USER_ID }),
    );
  });
});
