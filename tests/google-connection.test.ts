import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requireAdminAccountId: vi.fn(),
  requireUserId: vi.fn(),
  requireWritableBilling: vi.fn(),
  createClient: vi.fn(),
  createServiceRoleClient: vi.fn(),
  generatePropertyReportDoc: vi.fn(),
  getLeadDetail: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/supabase/account", () => ({
  requireAdminAccountId: mocks.requireAdminAccountId,
  requireUserId: mocks.requireUserId,
}));

vi.mock("@/lib/billing/access", () => ({
  requireWritableBilling: mocks.requireWritableBilling,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}));

vi.mock("@/lib/google/generate-report", () => ({
  generatePropertyReportDoc: mocks.generatePropertyReportDoc,
}));

vi.mock("@/lib/queries/leads", () => ({
  getLeadDetail: mocks.getLeadDetail,
}));

import { disconnectGoogle, updateDriveFolder } from "@/lib/actions/google";

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";

type QueryResult = { data: unknown; error: unknown };

function createServiceRoleMock() {
  const updates: Array<{
    table: string;
    payload: unknown;
    eqs: Array<[string, unknown]>;
  }> = [];
  const deletes: Array<{
    table: string;
    eqs: Array<[string, unknown]>;
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
      delete() {
        op = "delete";
        deletes.push({ table, eqs });
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
    updates,
    deletes,
    fromTables,
    setResult(table: string, op: string, result: QueryResult) {
      defaults[key(table, op)] = result;
    },
  };
}

describe("disconnectGoogle", () => {
  beforeEach(() => {
    mocks.revalidatePath.mockReset();
    mocks.requireAdminAccountId.mockReset();
    mocks.requireUserId.mockReset();
    mocks.requireWritableBilling.mockReset();
    mocks.createClient.mockReset();
    mocks.createServiceRoleClient.mockReset();
    mocks.requireAdminAccountId.mockResolvedValue(ACCOUNT_ID);
  });

  test("deletes google_integrations for the admin account via the service-role client", async () => {
    const supabase = createServiceRoleMock();
    mocks.createServiceRoleClient.mockReturnValue(supabase);

    await disconnectGoogle();

    expect(mocks.requireAdminAccountId).toHaveBeenCalled();
    expect(mocks.createServiceRoleClient).toHaveBeenCalled();
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(supabase.deletes).toEqual([
      {
        table: "google_integrations",
        eqs: [["account_id", ACCOUNT_ID]],
      },
    ]);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/settings/google");
  });

  test("throws the delete error", async () => {
    const supabase = createServiceRoleMock();
    supabase.setResult("google_integrations", "delete", {
      data: null,
      error: { message: "delete failed" },
    });
    mocks.createServiceRoleClient.mockReturnValue(supabase);

    await expect(disconnectGoogle()).rejects.toThrow("delete failed");
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

describe("updateDriveFolder", () => {
  beforeEach(() => {
    mocks.revalidatePath.mockReset();
    mocks.requireAdminAccountId.mockReset();
    mocks.requireUserId.mockReset();
    mocks.requireWritableBilling.mockReset();
    mocks.createClient.mockReset();
    mocks.createServiceRoleClient.mockReset();
    mocks.requireAdminAccountId.mockResolvedValue(ACCOUNT_ID);
  });

  test("stores a trimmed folder id via the service-role client", async () => {
    const supabase = createServiceRoleMock();
    mocks.createServiceRoleClient.mockReturnValue(supabase);

    await updateDriveFolder("  folder-1  ");

    expect(mocks.requireAdminAccountId).toHaveBeenCalled();
    expect(mocks.createServiceRoleClient).toHaveBeenCalled();
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(supabase.updates).toHaveLength(1);
    expect(supabase.updates[0]?.table).toBe("google_integrations");
    expect(supabase.updates[0]?.eqs).toEqual([["account_id", ACCOUNT_ID]]);
    expect(supabase.updates[0]?.payload).toEqual(
      expect.objectContaining({ drive_folder_id: "folder-1" }),
    );
    const payload = supabase.updates[0]?.payload as { updated_at: string };
    expect(new Date(payload.updated_at).toISOString()).toBe(payload.updated_at);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/settings/google");
  });

  test("stores whitespace as null", async () => {
    const supabase = createServiceRoleMock();
    mocks.createServiceRoleClient.mockReturnValue(supabase);

    await updateDriveFolder("   ");

    expect(supabase.updates[0]?.payload).toEqual(
      expect.objectContaining({ drive_folder_id: null }),
    );
  });

  test("throws the update error", async () => {
    const supabase = createServiceRoleMock();
    supabase.setResult("google_integrations", "update", {
      data: null,
      error: { message: "update failed" },
    });
    mocks.createServiceRoleClient.mockReturnValue(supabase);

    await expect(updateDriveFolder("folder-1")).rejects.toThrow("update failed");
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
