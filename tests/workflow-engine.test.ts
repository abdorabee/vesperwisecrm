import { beforeEach, describe, expect, test, vi } from "vitest";

import type { BillingAccountRow } from "@/lib/billing/access";

const { runWorkflowAction } = vi.hoisted(() => ({
  runWorkflowAction: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/queries/members", () => ({
  getCurrentMembership: vi.fn(),
  isAdminRole: vi.fn(),
}));

vi.mock("@/lib/workflows/actions", () => ({
  runWorkflowAction,
}));

import { runTriggeredWorkflows } from "@/lib/workflows/engine";

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const LEAD_ID = "lead-1";

function billingAccount(
  overrides: Partial<BillingAccountRow> = {},
): BillingAccountRow {
  return {
    account_id: ACCOUNT_ID,
    source: "polar",
    plan_key: "team",
    provider_status: "active",
    polar_customer_id: null,
    polar_subscription_id: null,
    seats: 5,
    current_period_start: null,
    current_period_end: null,
    trial_start: null,
    trial_end: null,
    cancel_at_period_end: false,
    past_due_since: null,
    last_provider_modified_at: null,
    ...overrides,
  };
}

function stageWorkflow(overrides: Record<string, unknown> = {}) {
  return {
    id: "wf-1",
    name: "On stage",
    account_id: ACCOUNT_ID,
    is_active: true,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    trigger_type: "stage_changed",
    trigger_config: { toStageId: "stage-won" },
    workflow_actions: [
      {
        id: "a2",
        step_number: 2,
        action_type: "add_tag",
        action_config: { tagId: "tag-1" },
        account_id: ACCOUNT_ID,
        workflow_id: "wf-1",
        created_at: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "a1",
        step_number: 1,
        action_type: "change_stage",
        action_config: { stageId: "stage-won" },
        account_id: ACCOUNT_ID,
        workflow_id: "wf-1",
        created_at: "2026-01-01T00:00:00.000Z",
      },
    ],
    ...overrides,
  };
}

function createSupabaseMock() {
  const inserts: Array<{ table: string; payload: unknown }> = [];
  let billingRow: BillingAccountRow | null = null;
  let workflowsResult: { data: unknown; error: unknown } = {
    data: [],
    error: null,
  };

  function from(table: string) {
    let insertPayload: unknown;
    const builder = {
      select() {
        return builder;
      },
      eq() {
        return builder;
      },
      insert(payload: unknown) {
        insertPayload = payload;
        inserts.push({ table, payload });
        return builder;
      },
      maybeSingle: async () => {
        if (table === "billing_accounts") {
          return { data: billingRow, error: null };
        }
        return { data: null, error: null };
      },
      then(
        onFulfilled: (value: { data: unknown; error: unknown }) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) {
        if (table === "workflows") {
          return Promise.resolve(workflowsResult).then(onFulfilled, onRejected);
        }
        if (table === "activities") {
          return Promise.resolve({ data: insertPayload, error: null }).then(
            onFulfilled,
            onRejected,
          );
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
    setBilling(row: BillingAccountRow | null) {
      billingRow = row;
    },
    setWorkflows(result: { data: unknown; error: unknown }) {
      workflowsResult = result;
    },
  };
}

describe("runTriggeredWorkflows", () => {
  beforeEach(() => {
    runWorkflowAction.mockReset();
    runWorkflowAction.mockResolvedValue(undefined);
  });

  test("returns without running actions when there is no billing row", async () => {
    const supabase = createSupabaseMock();

    await runTriggeredWorkflows(supabase as never, ACCOUNT_ID, "lead_created", {
      leadId: LEAD_ID,
    });

    expect(runWorkflowAction).not.toHaveBeenCalled();
    expect(supabase.inserts).toEqual([]);
  });

  test("does not run actions on a starter plan", async () => {
    const supabase = createSupabaseMock();
    supabase.setBilling(billingAccount({ plan_key: "starter" }));
    supabase.setWorkflows({ data: [stageWorkflow()], error: null });

    await runTriggeredWorkflows(supabase as never, ACCOUNT_ID, "stage_changed", {
      leadId: LEAD_ID,
      toStageId: "stage-won",
    });

    expect(runWorkflowAction).not.toHaveBeenCalled();
    expect(supabase.inserts).toEqual([]);
  });

  test("skips a stage_changed workflow when toStageId does not match", async () => {
    const supabase = createSupabaseMock();
    supabase.setBilling(billingAccount());
    supabase.setWorkflows({ data: [stageWorkflow()], error: null });

    await runTriggeredWorkflows(supabase as never, ACCOUNT_ID, "stage_changed", {
      leadId: LEAD_ID,
      toStageId: "stage-lost",
    });

    expect(runWorkflowAction).not.toHaveBeenCalled();
    expect(supabase.inserts).toEqual([]);
  });

  test("runs matching stage_changed actions in step_number order", async () => {
    const supabase = createSupabaseMock();
    supabase.setBilling(billingAccount());
    supabase.setWorkflows({ data: [stageWorkflow()], error: null });

    await runTriggeredWorkflows(supabase as never, ACCOUNT_ID, "stage_changed", {
      leadId: LEAD_ID,
      toStageId: "stage-won",
    });

    expect(runWorkflowAction.mock.calls.map((call) => call[3].id)).toEqual([
      "a1",
      "a2",
    ]);
    expect(runWorkflowAction).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      ACCOUNT_ID,
      LEAD_ID,
      expect.objectContaining({ id: "a1", step_number: 1 }),
    );
    expect(runWorkflowAction).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      ACCOUNT_ID,
      LEAD_ID,
      expect.objectContaining({ id: "a2", step_number: 2 }),
    );
    expect(supabase.inserts).toEqual([
      {
        table: "activities",
        payload: expect.objectContaining({
          type: "workflow_triggered",
          payload: expect.objectContaining({ status: "success" }),
        }),
      },
    ]);
  });

  test("skips tag_added when tagId mismatches and runs when it matches", async () => {
    const workflow = stageWorkflow({
      id: "wf-tag",
      name: "On tag",
      trigger_type: "tag_added",
      trigger_config: { tagId: "tag-1" },
      workflow_actions: [
        {
          id: "a1",
          step_number: 1,
          action_type: "add_tag",
          action_config: { tagId: "tag-1" },
          account_id: ACCOUNT_ID,
          workflow_id: "wf-tag",
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
    });
    const supabase = createSupabaseMock();
    supabase.setBilling(billingAccount());
    supabase.setWorkflows({ data: [workflow], error: null });

    await runTriggeredWorkflows(supabase as never, ACCOUNT_ID, "tag_added", {
      leadId: LEAD_ID,
      tagId: "tag-other",
    });
    expect(runWorkflowAction).not.toHaveBeenCalled();
    expect(supabase.inserts).toEqual([]);

    await runTriggeredWorkflows(supabase as never, ACCOUNT_ID, "tag_added", {
      leadId: LEAD_ID,
      tagId: "tag-1",
    });
    expect(runWorkflowAction).toHaveBeenCalledTimes(1);
    expect(supabase.inserts[0]?.payload).toEqual(
      expect.objectContaining({
        type: "workflow_triggered",
        payload: expect.objectContaining({ status: "success" }),
      }),
    );
  });

  test("matches lead_created when trigger_config is empty", async () => {
    const workflow = stageWorkflow({
      trigger_type: "lead_created",
      trigger_config: {},
      workflow_actions: [
        {
          id: "a1",
          step_number: 1,
          action_type: "change_stage",
          action_config: { stageId: "stage-won" },
          account_id: ACCOUNT_ID,
          workflow_id: "wf-1",
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
    });
    const supabase = createSupabaseMock();
    supabase.setBilling(billingAccount());
    supabase.setWorkflows({ data: [workflow], error: null });

    await runTriggeredWorkflows(supabase as never, ACCOUNT_ID, "lead_created", {
      leadId: LEAD_ID,
    });

    expect(runWorkflowAction).toHaveBeenCalledTimes(1);
  });

  test("records a failed activity and still runs a later workflow", async () => {
    runWorkflowAction
      .mockRejectedValueOnce(new Error("action failed"))
      .mockResolvedValue(undefined);

    const first = stageWorkflow({
      id: "wf-fail",
      name: "Fails",
      trigger_type: "lead_created",
      trigger_config: {},
      workflow_actions: [
        {
          id: "fail-1",
          step_number: 1,
          action_type: "add_tag",
          action_config: { tagId: "tag-1" },
          account_id: ACCOUNT_ID,
          workflow_id: "wf-fail",
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
    });
    const second = stageWorkflow({
      id: "wf-ok",
      name: "Succeeds",
      trigger_type: "lead_created",
      trigger_config: {},
      workflow_actions: [
        {
          id: "ok-1",
          step_number: 1,
          action_type: "add_tag",
          action_config: { tagId: "tag-2" },
          account_id: ACCOUNT_ID,
          workflow_id: "wf-ok",
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
    });
    const supabase = createSupabaseMock();
    supabase.setBilling(billingAccount());
    supabase.setWorkflows({ data: [first, second], error: null });

    await runTriggeredWorkflows(supabase as never, ACCOUNT_ID, "lead_created", {
      leadId: LEAD_ID,
    });

    expect(runWorkflowAction.mock.calls.map((call) => call[3].id)).toEqual([
      "fail-1",
      "ok-1",
    ]);
    expect(supabase.inserts.map((row) => row.payload)).toEqual([
      expect.objectContaining({
        type: "workflow_triggered",
        payload: expect.objectContaining({
          workflow_id: "wf-fail",
          status: "failed",
          error: "action failed",
        }),
      }),
      expect.objectContaining({
        type: "workflow_triggered",
        payload: expect.objectContaining({
          workflow_id: "wf-ok",
          status: "success",
        }),
      }),
    ]);
  });

  test("returns without throwing when the workflows query errors or is null", async () => {
    const supabase = createSupabaseMock();
    supabase.setBilling(billingAccount());
    supabase.setWorkflows({
      data: null,
      error: { message: "query failed" },
    });

    await expect(
      runTriggeredWorkflows(supabase as never, ACCOUNT_ID, "lead_created", {
        leadId: LEAD_ID,
      }),
    ).resolves.toBeUndefined();
    expect(runWorkflowAction).not.toHaveBeenCalled();

    supabase.setWorkflows({ data: null, error: null });
    await expect(
      runTriggeredWorkflows(supabase as never, ACCOUNT_ID, "lead_created", {
        leadId: LEAD_ID,
      }),
    ).resolves.toBeUndefined();
    expect(runWorkflowAction).not.toHaveBeenCalled();
  });
});
