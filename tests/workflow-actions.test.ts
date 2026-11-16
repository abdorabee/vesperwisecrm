import { beforeEach, describe, expect, test, vi } from "vitest";

import type { Tables } from "@/lib/supabase/types";

const mocks = vi.hoisted(() => ({
  enrollLeadInSequence: vi.fn(),
  assignLeadToGroup: vi.fn(),
  updateLeadStage: vi.fn(),
  addTagToLead: vi.fn(),
  runTriggeredWorkflows: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/actions/enrollments", () => ({
  enrollLeadInSequence: mocks.enrollLeadInSequence,
}));
vi.mock("@/lib/actions/groups", () => ({
  assignLeadToGroup: mocks.assignLeadToGroup,
}));
vi.mock("@/lib/actions/leads", () => ({
  updateLeadStage: mocks.updateLeadStage,
}));
vi.mock("@/lib/actions/tags", () => ({
  addTagToLead: mocks.addTagToLead,
}));
vi.mock("@/lib/workflows/engine", () => ({
  runTriggeredWorkflows: mocks.runTriggeredWorkflows,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { runWorkflowAction } from "@/lib/workflows/actions";

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const LEAD_ID = "lead-1";

type QueryResult = { data: unknown; error: unknown };

function action(
  overrides: Partial<Tables<"workflow_actions">> = {},
): Tables<"workflow_actions"> {
  return {
    id: "act-1",
    account_id: ACCOUNT_ID,
    workflow_id: "wf-1",
    step_number: 1,
    action_type: "change_stage",
    action_config: {},
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function createSupabaseMock() {
  const inserts: Array<{ table: string; payload: unknown }> = [];
  const updates: Array<{
    table: string;
    payload: unknown;
    eqs: Array<[string, unknown]>;
  }> = [];
  const maybeSingleResults: Record<string, QueryResult> = {};
  const insertResults: Record<string, QueryResult> = {
    lead_tasks: { data: { id: "task-1" }, error: null },
  };
  const updateResults: Record<string, QueryResult> = {
    leads: { data: [{ id: LEAD_ID }], error: null },
  };

  function from(table: string) {
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
      single: async () =>
        insertResults[table] ?? { data: null, error: null },
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
    setMaybeSingle(table: string, result: QueryResult) {
      maybeSingleResults[table] = result;
    },
    setInsertResult(table: string, result: QueryResult) {
      insertResults[table] = result;
    },
    setUpdateResult(table: string, result: QueryResult) {
      updateResults[table] = result;
    },
  };
}

function expectNoCascade() {
  expect(mocks.updateLeadStage).not.toHaveBeenCalled();
  expect(mocks.addTagToLead).not.toHaveBeenCalled();
  expect(mocks.runTriggeredWorkflows).not.toHaveBeenCalled();
}

describe("runWorkflowAction", () => {
  beforeEach(() => {
    mocks.enrollLeadInSequence.mockReset();
    mocks.assignLeadToGroup.mockReset();
    mocks.updateLeadStage.mockReset();
    mocks.addTagToLead.mockReset();
    mocks.runTriggeredWorkflows.mockReset();
    mocks.enrollLeadInSequence.mockResolvedValue(undefined);
    mocks.assignLeadToGroup.mockResolvedValue(undefined);
  });

  describe("change_stage", () => {
    test("throws when stageId is missing and does not update the lead", async () => {
      const supabase = createSupabaseMock();

      await expect(
        runWorkflowAction(supabase as never, ACCOUNT_ID, LEAD_ID, action()),
      ).rejects.toThrow("Workflow action is missing a stage");
      await expect(
        runWorkflowAction(
          supabase as never,
          ACCOUNT_ID,
          LEAD_ID,
          action({ action_config: { stageId: "" } }),
        ),
      ).rejects.toThrow("Workflow action is missing a stage");

      expect(supabase.updates).toEqual([]);
      expect(supabase.inserts).toEqual([]);
    });

    test("throws when the target stage is missing", async () => {
      const supabase = createSupabaseMock();
      supabase.setMaybeSingle("pipeline_stages", { data: null, error: null });

      await expect(
        runWorkflowAction(
          supabase as never,
          ACCOUNT_ID,
          LEAD_ID,
          action({ action_config: { stageId: "stage-1" } }),
        ),
      ).rejects.toThrow("Target stage not found");

      expect(supabase.updates).toEqual([]);
    });

    test("sets status won when is_won and does not cascade", async () => {
      const supabase = createSupabaseMock();
      supabase.setMaybeSingle("pipeline_stages", {
        data: { name: "Won", is_won: true, is_lost: false },
        error: null,
      });

      await runWorkflowAction(
        supabase as never,
        ACCOUNT_ID,
        LEAD_ID,
        action({ action_config: { stageId: "stage-1" } }),
      );

      expect(supabase.updates).toEqual([
        {
          table: "leads",
          payload: { pipeline_stage_id: "stage-1", status: "won" },
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
            payload: { to_stage: "Won" },
          },
        },
      ]);
      expectNoCascade();
    });

    test("sets status lost when is_lost", async () => {
      const supabase = createSupabaseMock();
      supabase.setMaybeSingle("pipeline_stages", {
        data: { name: "Lost", is_won: false, is_lost: true },
        error: null,
      });

      await runWorkflowAction(
        supabase as never,
        ACCOUNT_ID,
        LEAD_ID,
        action({ action_config: { stageId: "stage-lost" } }),
      );

      expect(supabase.updates[0]?.payload).toEqual({
        pipeline_stage_id: "stage-lost",
        status: "lost",
      });
      expectNoCascade();
    });

    test("sets status open when the stage is neither won nor lost", async () => {
      const supabase = createSupabaseMock();
      supabase.setMaybeSingle("pipeline_stages", {
        data: { name: "New", is_won: false, is_lost: false },
        error: null,
      });

      await runWorkflowAction(
        supabase as never,
        ACCOUNT_ID,
        LEAD_ID,
        action({ action_config: { stageId: "stage-open" } }),
      );

      expect(supabase.updates[0]?.payload).toEqual({
        pipeline_stage_id: "stage-open",
        status: "open",
      });
      expectNoCascade();
    });

    test("throws when the lead update matches no rows", async () => {
      const supabase = createSupabaseMock();
      supabase.setMaybeSingle("pipeline_stages", {
        data: { name: "Won", is_won: true, is_lost: false },
        error: null,
      });
      supabase.setUpdateResult("leads", { data: [], error: null });

      await expect(
        runWorkflowAction(
          supabase as never,
          ACCOUNT_ID,
          LEAD_ID,
          action({ action_config: { stageId: "stage-1" } }),
        ),
      ).rejects.toThrow("Lead not found");

      expect(supabase.inserts).toEqual([]);
    });

    test("throws the lead update error message", async () => {
      const supabase = createSupabaseMock();
      supabase.setMaybeSingle("pipeline_stages", {
        data: { name: "Won", is_won: true, is_lost: false },
        error: null,
      });
      supabase.setUpdateResult("leads", {
        data: null,
        error: { message: "update failed" },
      });

      await expect(
        runWorkflowAction(
          supabase as never,
          ACCOUNT_ID,
          LEAD_ID,
          action({ action_config: { stageId: "stage-1" } }),
        ),
      ).rejects.toThrow("update failed");

      expect(supabase.inserts).toEqual([]);
    });
  });

  describe("add_tag", () => {
    test("throws when tagId is missing", async () => {
      const supabase = createSupabaseMock();

      await expect(
        runWorkflowAction(
          supabase as never,
          ACCOUNT_ID,
          LEAD_ID,
          action({ action_type: "add_tag", action_config: {} }),
        ),
      ).rejects.toThrow("Workflow action is missing a tag");

      expect(mocks.addTagToLead).not.toHaveBeenCalled();
      expect(supabase.inserts).toEqual([]);
    });

    test("throws when the lead is missing", async () => {
      const supabase = createSupabaseMock();
      supabase.setMaybeSingle("leads", { data: null, error: null });

      await expect(
        runWorkflowAction(
          supabase as never,
          ACCOUNT_ID,
          LEAD_ID,
          action({ action_type: "add_tag", action_config: { tagId: "tag-1" } }),
        ),
      ).rejects.toThrow("Lead not found");

      expect(supabase.inserts).toEqual([]);
    });

    test("throws when the tag is missing", async () => {
      const supabase = createSupabaseMock();
      supabase.setMaybeSingle("leads", { data: { id: LEAD_ID }, error: null });
      supabase.setMaybeSingle("tags", { data: null, error: null });

      await expect(
        runWorkflowAction(
          supabase as never,
          ACCOUNT_ID,
          LEAD_ID,
          action({ action_type: "add_tag", action_config: { tagId: "tag-1" } }),
        ),
      ).rejects.toThrow("Tag not found");

      expect(supabase.inserts).toEqual([]);
    });

    test("inserts lead_tags and a tag_added activity without cascading", async () => {
      const supabase = createSupabaseMock();
      supabase.setMaybeSingle("leads", { data: { id: LEAD_ID }, error: null });
      supabase.setMaybeSingle("tags", { data: { name: "Hot" }, error: null });

      await runWorkflowAction(
        supabase as never,
        ACCOUNT_ID,
        LEAD_ID,
        action({ action_type: "add_tag", action_config: { tagId: "tag-1" } }),
      );

      expect(supabase.inserts).toEqual([
        {
          table: "lead_tags",
          payload: {
            account_id: ACCOUNT_ID,
            lead_id: LEAD_ID,
            tag_id: "tag-1",
          },
        },
        {
          table: "activities",
          payload: {
            account_id: ACCOUNT_ID,
            lead_id: LEAD_ID,
            type: "tag_added",
            payload: { tag_name: "Hot" },
          },
        },
      ]);
      expectNoCascade();
    });

    test("ignores duplicate lead_tags (23505) and still records tag_added", async () => {
      const supabase = createSupabaseMock();
      supabase.setMaybeSingle("leads", { data: { id: LEAD_ID }, error: null });
      supabase.setMaybeSingle("tags", { data: { name: "Hot" }, error: null });
      supabase.setInsertResult("lead_tags", {
        data: null,
        error: { code: "23505", message: "duplicate key" },
      });

      await expect(
        runWorkflowAction(
          supabase as never,
          ACCOUNT_ID,
          LEAD_ID,
          action({ action_type: "add_tag", action_config: { tagId: "tag-1" } }),
        ),
      ).resolves.toBeUndefined();

      expect(supabase.inserts.map((row) => row.table)).toEqual([
        "lead_tags",
        "activities",
      ]);
      expect(supabase.inserts[1]?.payload).toEqual(
        expect.objectContaining({
          type: "tag_added",
          payload: { tag_name: "Hot" },
        }),
      );
      expectNoCascade();
    });

    test("throws a non-duplicate insert error and does not insert activity", async () => {
      const supabase = createSupabaseMock();
      supabase.setMaybeSingle("leads", { data: { id: LEAD_ID }, error: null });
      supabase.setMaybeSingle("tags", { data: { name: "Hot" }, error: null });
      supabase.setInsertResult("lead_tags", {
        data: null,
        error: { code: "23503", message: "foreign key violation" },
      });

      await expect(
        runWorkflowAction(
          supabase as never,
          ACCOUNT_ID,
          LEAD_ID,
          action({ action_type: "add_tag", action_config: { tagId: "tag-1" } }),
        ),
      ).rejects.toThrow("foreign key violation");

      expect(supabase.inserts).toEqual([
        {
          table: "lead_tags",
          payload: {
            account_id: ACCOUNT_ID,
            lead_id: LEAD_ID,
            tag_id: "tag-1",
          },
        },
      ]);
    });
  });

  describe("send_email_template", () => {
    test("resolves the template against an object contact and creates a task", async () => {
      const supabase = createSupabaseMock();
      supabase.setMaybeSingle("leads", {
        data: {
          owner_user_id: "user-1",
          contact: { first_name: "Jane", last_name: "Doe" },
        },
        error: null,
      });

      await runWorkflowAction(
        supabase as never,
        ACCOUNT_ID,
        LEAD_ID,
        action({
          action_type: "send_email_template",
          action_config: {
            subject: "Follow up with {{first_name}}",
            bodyTemplate: "Hi {{first_name}} {{last_name}}",
          },
        }),
      );

      const taskInsert = supabase.inserts.find((row) => row.table === "lead_tasks");
      const taskPayload = taskInsert?.payload as {
        title: string;
        description: string | null;
        assigned_user_id: string | null;
        due_at: string;
        account_id: string;
        lead_id: string;
      };
      expect(taskPayload).toEqual(
        expect.objectContaining({
          account_id: ACCOUNT_ID,
          lead_id: LEAD_ID,
          title: "Follow up with Jane",
          description: "Hi Jane Doe",
          assigned_user_id: "user-1",
        }),
      );
      expect(typeof taskPayload.due_at).toBe("string");
      expect(new Date(taskPayload.due_at).toISOString()).toBe(taskPayload.due_at);

      expect(supabase.inserts.find((row) => row.table === "activities")?.payload).toEqual({
        account_id: ACCOUNT_ID,
        lead_id: LEAD_ID,
        type: "task_created",
        payload: {
          task_id: "task-1",
          title: "Follow up with Jane",
          due_at: taskPayload.due_at,
        },
      });
    });

    test("uses Follow up when subject and body are empty", async () => {
      const supabase = createSupabaseMock();
      supabase.setMaybeSingle("leads", {
        data: { owner_user_id: null, contact: { first_name: "Jane", last_name: "Doe" } },
        error: null,
      });

      await runWorkflowAction(
        supabase as never,
        ACCOUNT_ID,
        LEAD_ID,
        action({
          action_type: "send_email_template",
          action_config: { subject: "  ", bodyTemplate: "" },
        }),
      );

      expect(supabase.inserts[0]?.payload).toEqual(
        expect.objectContaining({
          title: "Follow up",
          description: null,
        }),
      );
    });

    test("uses the first body line as the title when subject is empty", async () => {
      const supabase = createSupabaseMock();
      supabase.setMaybeSingle("leads", {
        data: { owner_user_id: null, contact: { first_name: "Jane", last_name: "Doe" } },
        error: null,
      });

      await runWorkflowAction(
        supabase as never,
        ACCOUNT_ID,
        LEAD_ID,
        action({
          action_type: "send_email_template",
          action_config: { subject: "", bodyTemplate: "Hello Jane\nMore" },
        }),
      );

      expect(supabase.inserts[0]?.payload).toEqual(
        expect.objectContaining({
          title: "Hello Jane",
          description: "Hello Jane\nMore",
        }),
      );
    });

    test("throws when the task insert fails or returns no row", async () => {
      const failing = createSupabaseMock();
      failing.setMaybeSingle("leads", {
        data: { owner_user_id: null, contact: { first_name: "Jane", last_name: "Doe" } },
        error: null,
      });
      failing.setInsertResult("lead_tasks", {
        data: null,
        error: { message: "insert failed" },
      });

      await expect(
        runWorkflowAction(
          failing as never,
          ACCOUNT_ID,
          LEAD_ID,
          action({ action_type: "send_email_template", action_config: {} }),
        ),
      ).rejects.toThrow("insert failed");

      const missing = createSupabaseMock();
      missing.setMaybeSingle("leads", {
        data: { owner_user_id: null, contact: { first_name: "Jane", last_name: "Doe" } },
        error: null,
      });
      missing.setInsertResult("lead_tasks", { data: null, error: null });

      await expect(
        runWorkflowAction(
          missing as never,
          ACCOUNT_ID,
          LEAD_ID,
          action({ action_type: "send_email_template", action_config: {} }),
        ),
      ).rejects.toThrow("Failed to create follow-up task");
    });
  });

  describe("enroll_sequence, assign_round_robin, unknown", () => {
    test("requires sequenceId before enrolling", async () => {
      const supabase = createSupabaseMock();

      await expect(
        runWorkflowAction(
          supabase as never,
          ACCOUNT_ID,
          LEAD_ID,
          action({ action_type: "enroll_sequence", action_config: {} }),
        ),
      ).rejects.toThrow("Workflow action is missing a sequence");
      expect(mocks.enrollLeadInSequence).not.toHaveBeenCalled();

      await runWorkflowAction(
        supabase as never,
        ACCOUNT_ID,
        LEAD_ID,
        action({
          action_type: "enroll_sequence",
          action_config: { sequenceId: "seq-1" },
        }),
      );
      expect(mocks.enrollLeadInSequence).toHaveBeenCalledWith(LEAD_ID, "seq-1");
    });

    test("requires groupId before assigning round robin", async () => {
      const supabase = createSupabaseMock();

      await expect(
        runWorkflowAction(
          supabase as never,
          ACCOUNT_ID,
          LEAD_ID,
          action({ action_type: "assign_round_robin", action_config: {} }),
        ),
      ).rejects.toThrow("Workflow action is missing a routing group");
      expect(mocks.assignLeadToGroup).not.toHaveBeenCalled();

      await runWorkflowAction(
        supabase as never,
        ACCOUNT_ID,
        LEAD_ID,
        action({
          action_type: "assign_round_robin",
          action_config: { groupId: "group-1" },
        }),
      );
      expect(mocks.assignLeadToGroup).toHaveBeenCalledWith(LEAD_ID, "group-1");
    });

    test("throws for an unknown action type", async () => {
      const supabase = createSupabaseMock();

      await expect(
        runWorkflowAction(
          supabase as never,
          ACCOUNT_ID,
          LEAD_ID,
          action({ action_type: "explode", action_config: {} }),
        ),
      ).rejects.toThrow("Unknown workflow action type: explode");
    });
  });
});
