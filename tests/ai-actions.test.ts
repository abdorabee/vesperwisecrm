import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requireAccountId: vi.fn(),
  requireUserId: vi.fn(),
  requireBillingCapability: vi.fn(),
  createClient: vi.fn(),
  consumeRateLimit: vi.fn(),
  parseCallNotes: vi.fn(),
  scoreLead: vi.fn(),
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

vi.mock("@/lib/rate-limit", () => ({
  consumeRateLimit: mocks.consumeRateLimit,
}));

vi.mock("@/lib/ai/parse-call-notes", () => ({
  parseCallNotes: mocks.parseCallNotes,
}));

vi.mock("@/lib/ai/score-lead", () => ({
  scoreLead: mocks.scoreLead,
}));

import { parseCallNotesAction, scoreLeadAction } from "@/lib/actions/ai";

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "user-1";
const LEAD_ID = "lead-1";
const NOW = "2026-11-21T10:00:00.000Z";
const CREATED_AT = "2026-11-11T10:00:00.000Z";
const LAST_ACTIVITY_AT = "2026-11-18T10:00:00.000Z";

const SCORE_RESULT = {
  score: 82,
  summary: "Hot seller",
  positives: ["Motivated"],
  risks: ["Price high"],
};

type QueryResult = { data: unknown; error: unknown };

function createSupabaseMock() {
  const updates: Array<{
    table: string;
    payload: unknown;
    eqs: Array<[string, unknown]>;
  }> = [];
  const selects: Array<{
    table: string;
    eqs: Array<[string, unknown]>;
    isFilters: Array<[string, unknown]>;
    orders: Array<[string, unknown]>;
    limits: number[];
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
    let op: "select" | "update" = "select";
    const eqs: Array<[string, unknown]> = [];
    const isFilters: Array<[string, unknown]> = [];
    const orders: Array<[string, unknown]> = [];
    const limits: number[] = [];

    const builder = {
      select() {
        return builder;
      },
      eq(column: string, value: unknown) {
        eqs.push([column, value]);
        return builder;
      },
      is(column: string, value: unknown) {
        isFilters.push([column, value]);
        return builder;
      },
      order(column: string, options?: unknown) {
        orders.push([column, options]);
        return builder;
      },
      limit(value: number) {
        limits.push(value);
        return builder;
      },
      update(payload: unknown) {
        op = "update";
        updates.push({ table, payload, eqs });
        return builder;
      },
      single: async () => {
        selects.push({ table, eqs, isFilters, orders, limits });
        return take(table, op);
      },
      then(
        onFulfilled: (value: QueryResult) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) {
        if (op === "select") {
          selects.push({ table, eqs, isFilters, orders, limits });
        }
        return Promise.resolve(take(table, op)).then(onFulfilled, onRejected);
      },
    };

    return builder;
  }

  return {
    from,
    updates,
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

function leadRow(property: unknown) {
  return {
    id: LEAD_ID,
    account_id: ACCOUNT_ID,
    title: "123 Main St",
    qualification_status: "qualified",
    value: 250000,
    created_at: CREATED_AT,
    property,
  };
}

const PROPERTY_FIELDS = {
  id: "prop-1",
  account_id: ACCOUNT_ID,
  lead_id: LEAD_ID,
  asking_price: 250000,
  condition: "fair",
  motivation: "relocating",
};

describe("parseCallNotesAction", () => {
  beforeEach(() => {
    mocks.revalidatePath.mockReset();
    mocks.requireAccountId.mockReset();
    mocks.requireUserId.mockReset();
    mocks.requireBillingCapability.mockReset();
    mocks.createClient.mockReset();
    mocks.consumeRateLimit.mockReset();
    mocks.parseCallNotes.mockReset();
    mocks.requireAccountId.mockResolvedValue(ACCOUNT_ID);
    mocks.requireUserId.mockResolvedValue(USER_ID);
    mocks.requireBillingCapability.mockResolvedValue(undefined);
    mocks.consumeRateLimit.mockResolvedValue(true);
  });

  test("checks the AI capability and per-user budget then parses notes", async () => {
    const extracted = { motivation: "relocating", askingPrice: "250000" };
    mocks.parseCallNotes.mockResolvedValue(extracted);

    await expect(parseCallNotesAction("Seller wants out")).resolves.toEqual(
      extracted,
    );

    expect(mocks.requireBillingCapability).toHaveBeenCalledWith(ACCOUNT_ID, "ai");
    expect(mocks.consumeRateLimit).toHaveBeenCalledWith({
      scope: "ai-parse-call-notes",
      identifier: USER_ID,
      limit: 20,
      windowSeconds: 60,
    });
    expect(mocks.parseCallNotes).toHaveBeenCalledWith("Seller wants out");
  });

  test("throws when over budget and does not parse notes", async () => {
    mocks.consumeRateLimit.mockResolvedValue(false);

    await expect(parseCallNotesAction("Seller wants out")).rejects.toThrow(
      "Too many AI requests. Wait a moment and try again.",
    );

    expect(mocks.parseCallNotes).not.toHaveBeenCalled();
  });
});

describe("scoreLeadAction", () => {
  beforeEach(() => {
    mocks.revalidatePath.mockReset();
    mocks.requireAccountId.mockReset();
    mocks.requireUserId.mockReset();
    mocks.requireBillingCapability.mockReset();
    mocks.createClient.mockReset();
    mocks.consumeRateLimit.mockReset();
    mocks.scoreLead.mockReset();
    mocks.requireAccountId.mockResolvedValue(ACCOUNT_ID);
    mocks.requireUserId.mockResolvedValue(USER_ID);
    mocks.requireBillingCapability.mockResolvedValue(undefined);
    mocks.consumeRateLimit.mockResolvedValue(true);
    mocks.scoreLead.mockResolvedValue(SCORE_RESULT);
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(NOW));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("throws when over budget without selecting the lead or scoring", async () => {
    mocks.consumeRateLimit.mockResolvedValue(false);

    await expect(scoreLeadAction(LEAD_ID)).rejects.toThrow(
      "Too many AI requests. Wait a moment and try again.",
    );

    expect(mocks.consumeRateLimit).toHaveBeenCalledWith({
      scope: "ai-score-lead",
      identifier: USER_ID,
      limit: 20,
      windowSeconds: 60,
    });
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.scoreLead).not.toHaveBeenCalled();
  });

  test("throws Lead not found when the lead row is missing", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("leads", "select", { data: null, error: null });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(scoreLeadAction(LEAD_ID)).rejects.toThrow("Lead not found");

    expect(mocks.scoreLead).not.toHaveBeenCalled();
    expect(supabase.updates).toEqual([]);
  });

  test("throws the supabase message when the lead select errors", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("leads", "select", {
      data: null,
      error: { message: "no rows" },
    });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(scoreLeadAction(LEAD_ID)).rejects.toThrow("no rows");

    expect(mocks.scoreLead).not.toHaveBeenCalled();
  });

  test("throws the activity select error without scoring or updating the lead", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("leads", "select", {
      data: leadRow([PROPERTY_FIELDS]),
      error: null,
    });
    supabase.setResult("activities", "select", {
      data: null,
      error: { message: "activities failed" },
    });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(scoreLeadAction(LEAD_ID)).rejects.toThrow("activities failed");

    expect(mocks.scoreLead).not.toHaveBeenCalled();
    expect(supabase.updates).toEqual([]);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  test("scores from the first property array element, strips ids, and persists the result", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("leads", "select", {
      data: leadRow([PROPERTY_FIELDS]),
      error: null,
    });
    supabase.setResult("activities", "select", {
      data: [
        { type: "note_added", created_at: LAST_ACTIVITY_AT },
        { type: "note_added", created_at: "2026-11-17T10:00:00.000Z" },
        { type: "task_created", created_at: "2026-11-16T10:00:00.000Z" },
      ],
      error: null,
    });
    supabase.setResult("leads", "update", { data: null, error: null });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(scoreLeadAction(LEAD_ID)).resolves.toEqual(SCORE_RESULT);

    const leadSelect = supabase.selects.find((select) => select.table === "leads");
    expect(leadSelect?.eqs).toEqual([
      ["id", LEAD_ID],
      ["account_id", ACCOUNT_ID],
    ]);
    expect(leadSelect?.isFilters).toEqual([["deleted_at", null]]);

    expect(mocks.scoreLead).toHaveBeenCalledWith({
      title: "123 Main St",
      qualificationStatus: "qualified",
      value: 250000,
      property: {
        asking_price: 250000,
        condition: "fair",
        motivation: "relocating",
      },
      activityCounts: { note_added: 2, task_created: 1 },
      daysSinceCreated: 10,
      daysSinceLastActivity: 3,
    });
    expect(supabase.updates).toEqual([
      {
        table: "leads",
        payload: {
          ai_score: 82,
          ai_score_factors: {
            summary: "Hot seller",
            positives: ["Motivated"],
            risks: ["Price high"],
          },
          ai_scored_at: NOW,
        },
        eqs: [
          ["id", LEAD_ID],
          ["account_id", ACCOUNT_ID],
        ],
      },
    ]);
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/leads/${LEAD_ID}`);
  });

  test("uses an object property join the same way as the first array element", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("leads", "select", {
      data: leadRow(PROPERTY_FIELDS),
      error: null,
    });
    supabase.setResult("activities", "select", { data: [], error: null });
    supabase.setResult("leads", "update", { data: null, error: null });
    mocks.createClient.mockResolvedValue(supabase);

    await scoreLeadAction(LEAD_ID);

    expect(mocks.scoreLead).toHaveBeenCalledWith(
      expect.objectContaining({
        property: {
          asking_price: 250000,
          condition: "fair",
          motivation: "relocating",
        },
        daysSinceLastActivity: null,
      }),
    );
  });

  test("throws the update error after scoring and does not revalidate", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("leads", "select", {
      data: leadRow([PROPERTY_FIELDS]),
      error: null,
    });
    supabase.setResult("activities", "select", { data: [], error: null });
    supabase.setResult("leads", "update", {
      data: null,
      error: { message: "update failed" },
    });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(scoreLeadAction(LEAD_ID)).rejects.toThrow("update failed");

    expect(mocks.scoreLead).toHaveBeenCalledTimes(1);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
