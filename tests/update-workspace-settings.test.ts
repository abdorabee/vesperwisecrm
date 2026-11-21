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

import { updateWorkspaceSettings } from "@/lib/actions/workspace-settings";
import { WORKSPACE_SETTINGS_MIGRATION_REQUIRED_MESSAGE } from "@/lib/workspace-settings";

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";

const VALID_INPUT = {
  name: "VesperWise",
  timezone: "America/New_York",
  currencyCode: "USD",
  dateFormat: "month_day_year" as const,
  timeFormat: "12h" as const,
};

type QueryResult = { data: unknown; error: unknown };

function createSupabaseMock() {
  const updates: Array<{
    table: string;
    payload: unknown;
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
    let op: "select" | "update" = "select";
    const eqs: Array<[string, unknown]> = [];

    const builder = {
      select() {
        return builder;
      },
      eq(column: string, value: unknown) {
        eqs.push([column, value]);
        return builder;
      },
      update(payload: unknown) {
        op = "update";
        updates.push({ table, payload, eqs });
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
    updates,
    setResult(table: string, op: string, result: QueryResult) {
      defaults[key(table, op)] = result;
    },
  };
}

describe("updateWorkspaceSettings", () => {
  beforeEach(() => {
    mocks.revalidatePath.mockReset();
    mocks.requireAdminAccountId.mockReset();
    mocks.requireWritableBilling.mockReset();
    mocks.createClient.mockReset();
    mocks.requireAdminAccountId.mockResolvedValue(ACCOUNT_ID);
    mocks.requireWritableBilling.mockResolvedValue(undefined);
  });

  test("throws from zod for an empty name before requireAdminAccountId", async () => {
    await expect(
      updateWorkspaceSettings({ ...VALID_INPUT, name: "" }),
    ).rejects.toThrow("Workspace name is required");

    expect(mocks.requireAdminAccountId).not.toHaveBeenCalled();
    expect(mocks.requireWritableBilling).not.toHaveBeenCalled();
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  test("updates accounts with mapped columns and revalidates workspace surfaces", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("accounts", "update", {
      data: { id: ACCOUNT_ID },
      error: null,
    });
    mocks.createClient.mockResolvedValue(supabase);

    await updateWorkspaceSettings(VALID_INPUT);

    expect(mocks.requireAdminAccountId).toHaveBeenCalledTimes(1);
    expect(mocks.requireWritableBilling).toHaveBeenCalledWith(ACCOUNT_ID);
    expect(supabase.updates).toEqual([
      {
        table: "accounts",
        payload: {
          name: "VesperWise",
          timezone: "America/New_York",
          currency_code: "USD",
          date_format: "month_day_year",
          time_format: "12h",
        },
        eqs: [["id", ACCOUNT_ID]],
      },
    ]);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/settings/workspace");
  });

  test("throws the migration message for a missing timezone column and does not revalidate", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("accounts", "update", {
      data: null,
      error: {
        code: "42703",
        message: "column accounts.timezone does not exist",
      },
    });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(updateWorkspaceSettings(VALID_INPUT)).rejects.toThrow(
      WORKSPACE_SETTINGS_MIGRATION_REQUIRED_MESSAGE,
    );

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  test("throws an unrelated error message and does not revalidate", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("accounts", "update", {
      data: null,
      error: { code: "42501", message: "permission denied" },
    });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(updateWorkspaceSettings(VALID_INPUT)).rejects.toThrow(
      "permission denied",
    );

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
