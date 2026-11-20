import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requireAdminAccountId: vi.fn(),
  requireWritableBilling: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/supabase/account", () => ({
  requireAdminAccountId: mocks.requireAdminAccountId,
}));

vi.mock("@/lib/billing/access", () => ({
  requireWritableBilling: mocks.requireWritableBilling,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

import { revokeTeamInvite } from "@/lib/actions/team";

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const INVITE_ID = "invite-1";

type QueryResult = { data: unknown; error: unknown };

function createSupabaseMock() {
  const deletes: Array<{
    table: string;
    eqs: Array<[string, unknown]>;
    isFilters: Array<[string, unknown]>;
  }> = [];
  const fromTables: string[] = [];
  const defaults: Record<string, QueryResult> = {};

  function key(table: string, op: string) {
    return `${table}:${op}`;
  }

  function take(table: string, op: string): QueryResult {
    return defaults[key(table, op)] ?? { data: null, error: null };
  }

  function from(table: string) {
    fromTables.push(table);
    let op: "select" | "insert" | "update" | "delete" = "select";
    const eqs: Array<[string, unknown]> = [];
    const isFilters: Array<[string, unknown]> = [];

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
      insert() {
        op = "insert";
        return builder;
      },
      update() {
        op = "update";
        return builder;
      },
      delete() {
        op = "delete";
        deletes.push({ table, eqs, isFilters });
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
    deletes,
    fromTables,
    setResult(table: string, op: string, result: QueryResult) {
      defaults[key(table, op)] = result;
    },
  };
}

describe("revokeTeamInvite", () => {
  beforeEach(() => {
    mocks.revalidatePath.mockReset();
    mocks.requireAdminAccountId.mockReset();
    mocks.requireWritableBilling.mockReset();
    mocks.createClient.mockReset();
    mocks.requireAdminAccountId.mockResolvedValue(ACCOUNT_ID);
    mocks.requireWritableBilling.mockResolvedValue(undefined);
  });

  test("deletes only unredeemed invites for the admin account", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("invites", "delete", { data: null, error: null });
    mocks.createClient.mockResolvedValue(supabase);

    await revokeTeamInvite(INVITE_ID);

    expect(mocks.requireAdminAccountId).toHaveBeenCalledTimes(1);
    expect(mocks.requireWritableBilling).toHaveBeenCalledWith(ACCOUNT_ID);
    expect(supabase.deletes).toEqual([
      {
        table: "invites",
        eqs: [
          ["account_id", ACCOUNT_ID],
          ["id", INVITE_ID],
        ],
        isFilters: [["redeemed_at", null]],
      },
    ]);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/settings/members");
  });

  test("throws the delete error and does not revalidate", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("invites", "delete", {
      data: null,
      error: { message: "permission denied" },
    });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(revokeTeamInvite(INVITE_ID)).rejects.toThrow(
      "permission denied",
    );

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
