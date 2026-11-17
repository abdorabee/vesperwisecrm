import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requireAccountId: vi.fn(),
  requireUserId: vi.fn(),
  requireBillingCapability: vi.fn(),
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
  requireBillingCapability: mocks.requireBillingCapability,
}));

vi.mock("@/lib/workflows/engine", () => ({
  runTriggeredWorkflows: mocks.runTriggeredWorkflows,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

import { updateLeadStage } from "@/lib/actions/leads";

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "user-1";
const LEAD_ID = "lead-1";
const WON_STAGE_ID = "stage-won";
const LOST_STAGE_ID = "stage-lost";
const OPEN_STAGE_ID = "stage-open";

type QueryResult = { data: unknown; error: unknown };

function createSupabaseMock() {
  const inserts: Array<{ table: string; payload: unknown }> = [];
  const updates: Array<{
    table: string;
    payload: unknown;
    eqs: Array<[string, unknown]>;
  }> = [];
  const fromTables: string[] = [];
  const maybeSingleResults: Record<string, QueryResult> = {};
  const insertResults: Record<string, QueryResult> = {};
  const updateResults: Record<string, QueryResult> = {
    leads: { data: [{ id: LEAD_ID }], error: null },
  };

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
      maybeSingle: async () =>
        maybeSingleResults[table] ?? { data: null, error: null },
      then(
        onFulfilled: (value: QueryResult) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) {
        if (op === "update") {
          return Promise.resolve(
            updateResults[table] ?? { data: [{ id: LEAD_ID }], error: null },
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
    updates,
    fromTables,
    setMaybeSingle(table: string, result: QueryResult) {
      maybeSingleResults[table] = result;
    },
    setUpdateResult(table: string, result: QueryResult) {
      updateResults[table] = result;
    },
  };
}

function expectNoWorkflows() {
  expect(mocks.runTriggeredWorkflows).not.toHaveBeenCalled();
}

describe("updateLeadStage", () => {
  beforeEach(() => {
    mocks.revalidatePath.mockReset();
    mocks.requireAccountId.mockReset();
    mocks.requireUserId.mockReset();
    mocks.requireBillingCapability.mockReset();
    mocks.runTriggeredWorkflows.mockReset();
    mocks.createClient.mockReset();
    mocks.requireAccountId.mockResolvedValue(ACCOUNT_ID);
    mocks.requireUserId.mockResolvedValue(USER_ID);
    mocks.requireBillingCapability.mockResolvedValue(undefined);
    mocks.runTriggeredWorkflows.mockResolvedValue(undefined);
  });

  test("throws when the lead is missing and does not update, insert, or fire workflows", async () => {
    const supabase = createSupabaseMock();
    supabase.setMaybeSingle("leads", { data: null, error: null });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(updateLeadStage(LEAD_ID, WON_STAGE_ID)).rejects.toThrow(
      "Lead not found",
    );

    expect(supabase.fromTables).not.toContain("pipeline_stages");
    expect(supabase.updates).toEqual([]);
    expect(supabase.inserts).toEqual([]);
    expectNoWorkflows();
  });

  test("throws the lead query error message without fetching the stage", async () => {
    const supabase = createSupabaseMock();
    supabase.setMaybeSingle("leads", {
      data: null,
      error: { message: "lead query failed" },
    });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(updateLeadStage(LEAD_ID, WON_STAGE_ID)).rejects.toThrow(
      "lead query failed",
    );

    expect(supabase.fromTables).not.toContain("pipeline_stages");
    expect(supabase.updates).toEqual([]);
    expect(supabase.inserts).toEqual([]);
    expectNoWorkflows();
  });

  test("throws when the target stage is missing", async () => {
    const supabase = createSupabaseMock();
    supabase.setMaybeSingle("leads", {
      data: {
        pipeline_stage_id: "stage-old",
        pipeline_stages: { name: "New" },
      },
      error: null,
    });
    supabase.setMaybeSingle("pipeline_stages", { data: null, error: null });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(updateLeadStage(LEAD_ID, WON_STAGE_ID)).rejects.toThrow(
      "Stage not found",
    );

    expect(supabase.updates).toEqual([]);
    expect(supabase.inserts).toEqual([]);
    expectNoWorkflows();
  });

  test("sets status won, records from_stage from the joined object, and fires stage_changed workflows", async () => {
    const supabase = createSupabaseMock();
    supabase.setMaybeSingle("leads", {
      data: {
        pipeline_stage_id: "stage-old",
        pipeline_stages: { name: "New" },
      },
      error: null,
    });
    supabase.setMaybeSingle("pipeline_stages", {
      data: { name: "Won", is_won: true, is_lost: false },
      error: null,
    });
    mocks.createClient.mockResolvedValue(supabase);

    await updateLeadStage(LEAD_ID, WON_STAGE_ID);

    expect(mocks.requireBillingCapability).toHaveBeenCalledWith(
      ACCOUNT_ID,
      "pipeline",
    );
    expect(supabase.updates).toEqual([
      {
        table: "leads",
        payload: { pipeline_stage_id: WON_STAGE_ID, status: "won" },
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
          type: "stage_changed",
          actor_user_id: USER_ID,
          payload: { from_stage: "New", to_stage: "Won" },
        },
      },
    ]);
    expect(mocks.runTriggeredWorkflows).toHaveBeenCalledTimes(1);
    expect(mocks.runTriggeredWorkflows).toHaveBeenCalledWith(
      supabase,
      ACCOUNT_ID,
      "stage_changed",
      { leadId: LEAD_ID, toStageId: WON_STAGE_ID },
    );
  });

  test("sets status lost and still fires workflows", async () => {
    const supabase = createSupabaseMock();
    supabase.setMaybeSingle("leads", {
      data: {
        pipeline_stage_id: "stage-old",
        pipeline_stages: { name: "New" },
      },
      error: null,
    });
    supabase.setMaybeSingle("pipeline_stages", {
      data: { name: "Lost", is_won: false, is_lost: true },
      error: null,
    });
    mocks.createClient.mockResolvedValue(supabase);

    await updateLeadStage(LEAD_ID, LOST_STAGE_ID);

    expect(supabase.updates[0]?.payload).toEqual({
      pipeline_stage_id: LOST_STAGE_ID,
      status: "lost",
    });
    expect(mocks.runTriggeredWorkflows).toHaveBeenCalledTimes(1);
    expect(mocks.runTriggeredWorkflows).toHaveBeenCalledWith(
      supabase,
      ACCOUNT_ID,
      "stage_changed",
      { leadId: LEAD_ID, toStageId: LOST_STAGE_ID },
    );
  });

  test("sets status open when the stage is neither won nor lost and still fires workflows", async () => {
    const supabase = createSupabaseMock();
    supabase.setMaybeSingle("leads", {
      data: {
        pipeline_stage_id: "stage-old",
        pipeline_stages: { name: "New" },
      },
      error: null,
    });
    supabase.setMaybeSingle("pipeline_stages", {
      data: { name: "Qualified", is_won: false, is_lost: false },
      error: null,
    });
    mocks.createClient.mockResolvedValue(supabase);

    await updateLeadStage(LEAD_ID, OPEN_STAGE_ID);

    expect(supabase.updates[0]?.payload).toEqual({
      pipeline_stage_id: OPEN_STAGE_ID,
      status: "open",
    });
    expect(supabase.inserts[0]?.payload).toEqual(
      expect.objectContaining({
        type: "stage_changed",
        payload: { from_stage: "New", to_stage: "Qualified" },
      }),
    );
    expect(mocks.runTriggeredWorkflows).toHaveBeenCalledTimes(1);
    expect(mocks.runTriggeredWorkflows).toHaveBeenCalledWith(
      supabase,
      ACCOUNT_ID,
      "stage_changed",
      { leadId: LEAD_ID, toStageId: OPEN_STAGE_ID },
    );
  });

  test("throws when the lead update matches no rows and does not insert or fire workflows", async () => {
    const supabase = createSupabaseMock();
    supabase.setMaybeSingle("leads", {
      data: {
        pipeline_stage_id: "stage-old",
        pipeline_stages: { name: "New" },
      },
      error: null,
    });
    supabase.setMaybeSingle("pipeline_stages", {
      data: { name: "Won", is_won: true, is_lost: false },
      error: null,
    });
    supabase.setUpdateResult("leads", { data: [], error: null });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(updateLeadStage(LEAD_ID, WON_STAGE_ID)).rejects.toThrow(
      "Lead not found",
    );

    expect(supabase.inserts).toEqual([]);
    expectNoWorkflows();
  });

  test("throws the lead update error message and does not insert or fire workflows", async () => {
    const supabase = createSupabaseMock();
    supabase.setMaybeSingle("leads", {
      data: {
        pipeline_stage_id: "stage-old",
        pipeline_stages: { name: "New" },
      },
      error: null,
    });
    supabase.setMaybeSingle("pipeline_stages", {
      data: { name: "Won", is_won: true, is_lost: false },
      error: null,
    });
    supabase.setUpdateResult("leads", {
      data: null,
      error: { message: "update failed" },
    });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(updateLeadStage(LEAD_ID, WON_STAGE_ID)).rejects.toThrow(
      "update failed",
    );

    expect(supabase.inserts).toEqual([]);
    expectNoWorkflows();
  });
});
