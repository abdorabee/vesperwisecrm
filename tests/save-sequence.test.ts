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

import { saveSequence } from "@/lib/actions/sequences";
import type { SequenceInput } from "@/lib/validations/sequence";

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const SEQUENCE_ID = "seq-1";

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
    setResult(table: string, op: string, result: QueryResult) {
      defaults[key(table, op)] = result;
    },
  };
}

function validInput(overrides: Partial<SequenceInput> = {}): SequenceInput {
  return {
    name: "Follow up",
    steps: [
      {
        delayDays: "3",
        subject: "  Hello  ",
        bodyTemplate: "Call the lead",
      },
      {
        delayDays: "",
        bodyTemplate: "Send the packet",
      },
    ],
    ...overrides,
  };
}

describe("saveSequence", () => {
  beforeEach(() => {
    mocks.revalidatePath.mockReset();
    mocks.requireAccountId.mockReset();
    mocks.requireAdminAccountId.mockReset();
    mocks.requireBillingCapability.mockReset();
    mocks.createClient.mockReset();
    mocks.requireAccountId.mockResolvedValue(ACCOUNT_ID);
    mocks.requireBillingCapability.mockResolvedValue(undefined);
  });

  test("requires the account and the sequences billing capability, not admin", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("sequences", "insert", {
      data: { id: SEQUENCE_ID },
      error: null,
    });
    supabase.setResult("sequence_steps", "insert", { data: null, error: null });
    mocks.createClient.mockResolvedValue(supabase);

    await saveSequence(validInput());

    expect(mocks.requireAccountId).toHaveBeenCalledTimes(1);
    expect(mocks.requireAdminAccountId).not.toHaveBeenCalled();
    expect(mocks.requireBillingCapability).toHaveBeenCalledWith(
      ACCOUNT_ID,
      "sequences",
    );
  });

  test("creates a sequence with null empty description and mapped steps", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("sequences", "insert", {
      data: { id: SEQUENCE_ID },
      error: null,
    });
    supabase.setResult("sequence_steps", "insert", { data: null, error: null });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(saveSequence(validInput({ description: "" }))).resolves.toEqual(
      { sequenceId: SEQUENCE_ID },
    );

    expect(supabase.inserts).toEqual([
      {
        table: "sequences",
        payload: {
          account_id: ACCOUNT_ID,
          name: "Follow up",
          description: null,
          is_marketing: false,
        },
      },
      {
        table: "sequence_steps",
        payload: [
          {
            account_id: ACCOUNT_ID,
            sequence_id: SEQUENCE_ID,
            step_number: 1,
            channel: "task",
            delay_days: 3,
            subject: "Hello",
            body_template: "Call the lead",
          },
          {
            account_id: ACCOUNT_ID,
            sequence_id: SEQUENCE_ID,
            step_number: 2,
            channel: "task",
            delay_days: 0,
            subject: null,
            body_template: "Send the packet",
          },
        ],
      },
    ]);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/sequences");
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/sequences/${SEQUENCE_ID}`);
  });

  test("stores an omitted description as null", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("sequences", "insert", {
      data: { id: SEQUENCE_ID },
      error: null,
    });
    supabase.setResult("sequence_steps", "insert", { data: null, error: null });
    mocks.createClient.mockResolvedValue(supabase);

    await saveSequence({
      name: "Follow up",
      steps: [{ bodyTemplate: "Call the lead" }],
    });

    expect(supabase.inserts[0]).toEqual({
      table: "sequences",
      payload: {
        account_id: ACCOUNT_ID,
        name: "Follow up",
        description: null,
        is_marketing: false,
      },
    });
  });

  test("throws Sequence not found on an empty update before deleting steps", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("sequences", "update", { data: [], error: null });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(saveSequence(validInput(), SEQUENCE_ID)).rejects.toThrow(
      "Sequence not found",
    );

    expect(supabase.updates).toEqual([
      {
        table: "sequences",
        payload: {
          name: "Follow up",
          description: null,
          is_marketing: false,
        },
        eqs: [
          ["id", SEQUENCE_ID],
          ["account_id", ACCOUNT_ID],
        ],
      },
    ]);
    expect(supabase.deletes).toEqual([]);
    expect(supabase.inserts).toEqual([]);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  test("updates the account-scoped sequence, replaces steps, and revalidates", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("sequences", "update", {
      data: [{ id: SEQUENCE_ID }],
      error: null,
    });
    supabase.setResult("sequence_steps", "delete", { data: null, error: null });
    supabase.setResult("sequence_steps", "insert", { data: null, error: null });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(
      saveSequence(validInput({ description: "Nurture" }), SEQUENCE_ID),
    ).resolves.toEqual({ sequenceId: SEQUENCE_ID });

    expect(supabase.updates[0].eqs).toEqual([
      ["id", SEQUENCE_ID],
      ["account_id", ACCOUNT_ID],
    ]);
    expect(supabase.deletes).toEqual([
      {
        table: "sequence_steps",
        eqs: [
          ["sequence_id", SEQUENCE_ID],
          ["account_id", ACCOUNT_ID],
        ],
      },
    ]);
    expect(supabase.inserts).toEqual([
      {
        table: "sequence_steps",
        payload: [
          {
            account_id: ACCOUNT_ID,
            sequence_id: SEQUENCE_ID,
            step_number: 1,
            channel: "task",
            delay_days: 3,
            subject: "Hello",
            body_template: "Call the lead",
          },
          {
            account_id: ACCOUNT_ID,
            sequence_id: SEQUENCE_ID,
            step_number: 2,
            channel: "task",
            delay_days: 0,
            subject: null,
            body_template: "Send the packet",
          },
        ],
      },
    ]);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/sequences");
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/sequences/${SEQUENCE_ID}`);
  });

  test("throws the step insert error", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("sequences", "insert", {
      data: { id: SEQUENCE_ID },
      error: null,
    });
    supabase.setResult("sequence_steps", "insert", {
      data: null,
      error: { message: "steps insert failed" },
    });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(saveSequence(validInput())).rejects.toThrow(
      "steps insert failed",
    );

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
