import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requireAdminAccountId: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/supabase/account", () => ({
  requireAdminAccountId: mocks.requireAdminAccountId,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

import {
  createTvDisplayTokenAction,
  revokeTvDisplayTokenAction,
} from "@/lib/actions/tv";

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const TOKEN_ID = "tv-1";
const NOW = "2026-11-21T10:00:00.000Z";

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

describe("tv display tokens", () => {
  beforeEach(() => {
    mocks.revalidatePath.mockReset();
    mocks.requireAdminAccountId.mockReset();
    mocks.createClient.mockReset();
    mocks.requireAdminAccountId.mockResolvedValue(ACCOUNT_ID);
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(NOW));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("throws Display name is required for an empty name before insert", async () => {
    await expect(createTvDisplayTokenAction("")).rejects.toThrow(
      "Display name is required",
    );

    expect(mocks.requireAdminAccountId).toHaveBeenCalledTimes(1);
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  test("throws Display name is required for a whitespace name before insert", async () => {
    await expect(createTvDisplayTokenAction("   \t  ")).rejects.toThrow(
      "Display name is required",
    );

    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  test("trims the name, inserts account-scoped token, and revalidates /team", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("tv_display_tokens", "insert", {
      data: { id: TOKEN_ID },
      error: null,
    });
    mocks.createClient.mockResolvedValue(supabase);

    await createTvDisplayTokenAction("  Lobby  ");

    expect(supabase.inserts).toEqual([
      {
        table: "tv_display_tokens",
        payload: { account_id: ACCOUNT_ID, name: "Lobby" },
      },
    ]);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/team");
  });

  test("throws the insert error and does not revalidate", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("tv_display_tokens", "insert", {
      data: null,
      error: { message: "insert failed" },
    });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(createTvDisplayTokenAction("Lobby")).rejects.toThrow(
      "insert failed",
    );

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  test("revokes by id and account_id with an ISO timestamp and revalidates /team", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("tv_display_tokens", "update", {
      data: null,
      error: null,
    });
    mocks.createClient.mockResolvedValue(supabase);

    await revokeTvDisplayTokenAction(TOKEN_ID);

    expect(supabase.updates).toEqual([
      {
        table: "tv_display_tokens",
        payload: { revoked_at: NOW },
        eqs: [
          ["id", TOKEN_ID],
          ["account_id", ACCOUNT_ID],
        ],
      },
    ]);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/team");
  });

  test("throws the revoke update error and does not revalidate", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("tv_display_tokens", "update", {
      data: null,
      error: { message: "update failed" },
    });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(revokeTvDisplayTokenAction(TOKEN_ID)).rejects.toThrow(
      "update failed",
    );

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
