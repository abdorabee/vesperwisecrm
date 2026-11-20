import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requireAdminAccountId: vi.fn(),
  requireAccountId: vi.fn(),
  requireBillingCapability: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/supabase/account", () => ({
  requireAdminAccountId: mocks.requireAdminAccountId,
  requireAccountId: mocks.requireAccountId,
}));

vi.mock("@/lib/billing/access", () => ({
  requireBillingCapability: mocks.requireBillingCapability,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

import {
  deleteWorkflow,
  saveWorkflow,
  toggleWorkflowActive,
} from "@/lib/actions/workflows";
import type { WorkflowInput } from "@/lib/validations/workflow";

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const WORKFLOW_ID = "wf-1";
const STAGE_ID = "stage-1";
const TAG_ID = "tag-1";
const SEQUENCE_ID = "seq-1";
const GROUP_ID = "group-1";

type QueryResult = { data: unknown; error: unknown };

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
  const selects: Array<{
    table: string;
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
      maybeSingle: async () => {
        selects.push({ table, eqs: [...eqs] });
        return take(table, op);
      },
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
    deletes,
    selects,
    fromTables,
    setResult(table: string, op: string, result: QueryResult) {
      defaults[key(table, op)] = result;
    },
    enqueue(table: string, op: string, result: QueryResult) {
      const k = key(table, op);
      queues[k] ??= [];
      queues[k].push(result);
    },
  };
}

function emailAction(
  overrides: Partial<WorkflowInput["actions"][number]> = {},
): WorkflowInput["actions"][number] {
  return {
    actionType: "send_email_template",
    subject: "Hello",
    ...overrides,
  };
}

function baseInput(overrides: Partial<WorkflowInput> = {}): WorkflowInput {
  return {
    name: "Welcome",
    triggerType: "lead_created",
    isActive: true,
    actions: [emailAction()],
    ...overrides,
  };
}

function found(id: string): QueryResult {
  return { data: { id }, error: null };
}

describe("saveWorkflow", () => {
  beforeEach(() => {
    mocks.revalidatePath.mockReset();
    mocks.requireAdminAccountId.mockReset();
    mocks.requireAccountId.mockReset();
    mocks.requireBillingCapability.mockReset();
    mocks.createClient.mockReset();
    mocks.requireAdminAccountId.mockResolvedValue(ACCOUNT_ID);
    mocks.requireBillingCapability.mockResolvedValue(undefined);
  });

  test("requires an admin account and the workflows billing capability", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("workflows", "insert", {
      data: { id: WORKFLOW_ID },
      error: null,
    });
    supabase.setResult("workflow_actions", "insert", {
      data: null,
      error: null,
    });
    mocks.createClient.mockResolvedValue(supabase);

    await saveWorkflow(baseInput());

    expect(mocks.requireAdminAccountId).toHaveBeenCalledTimes(1);
    expect(mocks.requireAccountId).not.toHaveBeenCalled();
    expect(mocks.requireBillingCapability).toHaveBeenCalledWith(
      ACCOUNT_ID,
      "workflows",
    );
  });

  test("stores an empty trigger_config for lead_created", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("workflows", "insert", {
      data: { id: WORKFLOW_ID },
      error: null,
    });
    supabase.setResult("workflow_actions", "insert", {
      data: null,
      error: null,
    });
    mocks.createClient.mockResolvedValue(supabase);

    await saveWorkflow(baseInput({ triggerType: "lead_created" }));

    expect(supabase.inserts.find((row) => row.table === "workflows")?.payload).toEqual(
      {
        account_id: ACCOUNT_ID,
        name: "Welcome",
        trigger_type: "lead_created",
        trigger_config: {},
        is_active: true,
      },
    );
  });

  test("looks up the stage by id and account and stores toStageId", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("pipeline_stages", "select", found(STAGE_ID));
    supabase.setResult("workflows", "insert", {
      data: { id: WORKFLOW_ID },
      error: null,
    });
    supabase.setResult("workflow_actions", "insert", {
      data: null,
      error: null,
    });
    mocks.createClient.mockResolvedValue(supabase);

    await saveWorkflow(
      baseInput({
        triggerType: "stage_changed",
        triggerStageId: STAGE_ID,
      }),
    );

    expect(supabase.selects).toContainEqual({
      table: "pipeline_stages",
      eqs: [
        ["id", STAGE_ID],
        ["account_id", ACCOUNT_ID],
      ],
    });
    expect(
      supabase.inserts.find((row) => row.table === "workflows")?.payload,
    ).toMatchObject({
      trigger_type: "stage_changed",
      trigger_config: { toStageId: STAGE_ID },
    });
  });

  test("throws Stage not found and does not insert workflows when the trigger stage is missing", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("pipeline_stages", "select", { data: null, error: null });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(
      saveWorkflow(
        baseInput({
          triggerType: "stage_changed",
          triggerStageId: STAGE_ID,
        }),
      ),
    ).rejects.toThrow("Stage not found");

    expect(supabase.inserts.filter((row) => row.table === "workflows")).toEqual(
      [],
    );
  });

  test("stores tagId for tag_added and looks up the tag in the account", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("tags", "select", found(TAG_ID));
    supabase.setResult("workflows", "insert", {
      data: { id: WORKFLOW_ID },
      error: null,
    });
    supabase.setResult("workflow_actions", "insert", {
      data: null,
      error: null,
    });
    mocks.createClient.mockResolvedValue(supabase);

    await saveWorkflow(
      baseInput({
        triggerType: "tag_added",
        triggerTagId: TAG_ID,
      }),
    );

    expect(supabase.selects).toContainEqual({
      table: "tags",
      eqs: [
        ["id", TAG_ID],
        ["account_id", ACCOUNT_ID],
      ],
    });
    expect(
      supabase.inserts.find((row) => row.table === "workflows")?.payload,
    ).toMatchObject({
      trigger_config: { tagId: TAG_ID },
    });
  });

  test("throws Tag not found before inserting when the trigger tag is missing", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("tags", "select", { data: null, error: null });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(
      saveWorkflow(
        baseInput({
          triggerType: "tag_added",
          triggerTagId: TAG_ID,
        }),
      ),
    ).rejects.toThrow("Tag not found");

    expect(supabase.inserts.filter((row) => row.table === "workflows")).toEqual(
      [],
    );
  });

  test("stores days as a number for no_activity_days", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("workflows", "insert", {
      data: { id: WORKFLOW_ID },
      error: null,
    });
    supabase.setResult("workflow_actions", "insert", {
      data: null,
      error: null,
    });
    mocks.createClient.mockResolvedValue(supabase);

    await saveWorkflow(
      baseInput({
        triggerType: "no_activity_days",
        triggerDays: "3",
      }),
    );

    expect(
      supabase.inserts.find((row) => row.table === "workflows")?.payload,
    ).toMatchObject({
      trigger_config: { days: 3 },
    });
  });

  test("stores hours as a number for no_next_action", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("workflows", "insert", {
      data: { id: WORKFLOW_ID },
      error: null,
    });
    supabase.setResult("workflow_actions", "insert", {
      data: null,
      error: null,
    });
    mocks.createClient.mockResolvedValue(supabase);

    await saveWorkflow(
      baseInput({
        triggerType: "no_next_action",
        triggerHours: "2",
      }),
    );

    expect(
      supabase.inserts.find((row) => row.table === "workflows")?.payload,
    ).toMatchObject({
      trigger_config: { hours: 2 },
    });
  });

  test("throws Sequence not found and does not insert the workflow", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("sequences", "select", { data: null, error: null });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(
      saveWorkflow(
        baseInput({
          actions: [{ actionType: "enroll_sequence", sequenceId: SEQUENCE_ID }],
        }),
      ),
    ).rejects.toThrow("Sequence not found");

    expect(supabase.inserts.filter((row) => row.table === "workflows")).toEqual(
      [],
    );
  });

  test("throws Tag not found for a missing action tag", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("tags", "select", { data: null, error: null });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(
      saveWorkflow(
        baseInput({
          actions: [{ actionType: "add_tag", tagId: TAG_ID }],
        }),
      ),
    ).rejects.toThrow("Tag not found");

    expect(supabase.inserts.filter((row) => row.table === "workflows")).toEqual(
      [],
    );
  });

  test("throws Stage not found for a missing action stage", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("pipeline_stages", "select", { data: null, error: null });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(
      saveWorkflow(
        baseInput({
          actions: [{ actionType: "change_stage", stageId: STAGE_ID }],
        }),
      ),
    ).rejects.toThrow("Stage not found");

    expect(supabase.inserts.filter((row) => row.table === "workflows")).toEqual(
      [],
    );
  });

  test("throws Routing group not found for a missing action group", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("lead_groups", "select", { data: null, error: null });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(
      saveWorkflow(
        baseInput({
          actions: [{ actionType: "assign_round_robin", groupId: GROUP_ID }],
        }),
      ),
    ).rejects.toThrow("Routing group not found");

    expect(supabase.inserts.filter((row) => row.table === "workflows")).toEqual(
      [],
    );
  });

  test("inserts workflow_actions with 1-based steps and mapped action_config", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("sequences", "select", found(SEQUENCE_ID));
    supabase.setResult("tags", "select", found(TAG_ID));
    supabase.setResult("lead_groups", "select", found(GROUP_ID));
    supabase.setResult("pipeline_stages", "select", found(STAGE_ID));
    supabase.setResult("workflows", "insert", {
      data: { id: WORKFLOW_ID },
      error: null,
    });
    supabase.setResult("workflow_actions", "insert", {
      data: null,
      error: null,
    });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(
      saveWorkflow(
        baseInput({
          actions: [
            { actionType: "send_email_template", subject: "Hello" },
            { actionType: "enroll_sequence", sequenceId: SEQUENCE_ID },
            { actionType: "add_tag", tagId: TAG_ID },
            { actionType: "assign_round_robin", groupId: GROUP_ID },
            { actionType: "change_stage", stageId: STAGE_ID },
          ],
        }),
      ),
    ).resolves.toEqual({ workflowId: WORKFLOW_ID });

    expect(
      supabase.inserts.find((row) => row.table === "workflow_actions")?.payload,
    ).toEqual([
      {
        account_id: ACCOUNT_ID,
        workflow_id: WORKFLOW_ID,
        step_number: 1,
        action_type: "send_email_template",
        action_config: { subject: "Hello", bodyTemplate: null },
      },
      {
        account_id: ACCOUNT_ID,
        workflow_id: WORKFLOW_ID,
        step_number: 2,
        action_type: "enroll_sequence",
        action_config: { sequenceId: SEQUENCE_ID },
      },
      {
        account_id: ACCOUNT_ID,
        workflow_id: WORKFLOW_ID,
        step_number: 3,
        action_type: "add_tag",
        action_config: { tagId: TAG_ID },
      },
      {
        account_id: ACCOUNT_ID,
        workflow_id: WORKFLOW_ID,
        step_number: 4,
        action_type: "assign_round_robin",
        action_config: { groupId: GROUP_ID },
      },
      {
        account_id: ACCOUNT_ID,
        workflow_id: WORKFLOW_ID,
        step_number: 5,
        action_type: "change_stage",
        action_config: { stageId: STAGE_ID },
      },
    ]);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/workflows");
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/workflows/${WORKFLOW_ID}`);
  });

  test("throws Workflow not found on an empty update before deleting actions", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("workflows", "update", { data: [], error: null });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(saveWorkflow(baseInput(), WORKFLOW_ID)).rejects.toThrow(
      "Workflow not found",
    );

    expect(supabase.deletes).toEqual([]);
    expect(
      supabase.inserts.filter((row) => row.table === "workflow_actions"),
    ).toEqual([]);
  });

  test("deletes existing actions scoped by workflow and account then inserts replacements", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("workflows", "update", {
      data: [{ id: WORKFLOW_ID }],
      error: null,
    });
    supabase.setResult("workflow_actions", "delete", {
      data: null,
      error: null,
    });
    supabase.setResult("workflow_actions", "insert", {
      data: null,
      error: null,
    });
    mocks.createClient.mockResolvedValue(supabase);

    await saveWorkflow(baseInput(), WORKFLOW_ID);

    expect(supabase.updates).toEqual([
      {
        table: "workflows",
        payload: {
          name: "Welcome",
          trigger_type: "lead_created",
          trigger_config: {},
          is_active: true,
        },
        eqs: [
          ["id", WORKFLOW_ID],
          ["account_id", ACCOUNT_ID],
        ],
      },
    ]);
    expect(supabase.deletes).toEqual([
      {
        table: "workflow_actions",
        eqs: [
          ["workflow_id", WORKFLOW_ID],
          ["account_id", ACCOUNT_ID],
        ],
      },
    ]);
    expect(
      supabase.inserts.find((row) => row.table === "workflow_actions")?.payload,
    ).toEqual([
      {
        account_id: ACCOUNT_ID,
        workflow_id: WORKFLOW_ID,
        step_number: 1,
        action_type: "send_email_template",
        action_config: { subject: "Hello", bodyTemplate: null },
      },
    ]);
  });
});

describe("deleteWorkflow", () => {
  beforeEach(() => {
    mocks.revalidatePath.mockReset();
    mocks.requireAdminAccountId.mockReset();
    mocks.requireBillingCapability.mockReset();
    mocks.createClient.mockReset();
    mocks.requireAdminAccountId.mockResolvedValue(ACCOUNT_ID);
    mocks.requireBillingCapability.mockResolvedValue(undefined);
  });

  test("deletes by id and account_id and revalidates on success", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("workflows", "delete", {
      data: [{ id: WORKFLOW_ID }],
      error: null,
    });
    mocks.createClient.mockResolvedValue(supabase);

    await deleteWorkflow(WORKFLOW_ID);

    expect(mocks.requireBillingCapability).toHaveBeenCalledWith(
      ACCOUNT_ID,
      "workflows",
    );
    expect(supabase.deletes).toEqual([
      {
        table: "workflows",
        eqs: [
          ["id", WORKFLOW_ID],
          ["account_id", ACCOUNT_ID],
        ],
      },
    ]);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/workflows");
  });

  test("throws Workflow not found when no rows are deleted", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("workflows", "delete", { data: [], error: null });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(deleteWorkflow(WORKFLOW_ID)).rejects.toThrow(
      "Workflow not found",
    );

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

describe("toggleWorkflowActive", () => {
  beforeEach(() => {
    mocks.revalidatePath.mockReset();
    mocks.requireAdminAccountId.mockReset();
    mocks.requireBillingCapability.mockReset();
    mocks.createClient.mockReset();
    mocks.requireAdminAccountId.mockResolvedValue(ACCOUNT_ID);
    mocks.requireBillingCapability.mockResolvedValue(undefined);
  });

  test("updates is_active scoped by id and account_id", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("workflows", "update", {
      data: [{ id: WORKFLOW_ID }],
      error: null,
    });
    mocks.createClient.mockResolvedValue(supabase);

    await toggleWorkflowActive(WORKFLOW_ID, false);

    expect(supabase.updates).toEqual([
      {
        table: "workflows",
        payload: { is_active: false },
        eqs: [
          ["id", WORKFLOW_ID],
          ["account_id", ACCOUNT_ID],
        ],
      },
    ]);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/workflows");
  });

  test("throws Workflow not found when the update matches no rows", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("workflows", "update", { data: [], error: null });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(toggleWorkflowActive(WORKFLOW_ID, true)).rejects.toThrow(
      "Workflow not found",
    );

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
