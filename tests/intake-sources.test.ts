import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requireAdminAccountId: vi.fn(),
  createServiceRoleClient: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/supabase/account", () => ({
  requireAdminAccountId: mocks.requireAdminAccountId,
}));

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

import { createLeadIntakeSource } from "@/lib/actions/intake-sources";
import {
  hashIntakeToken,
  isWellFormedIntakeToken,
} from "@/lib/leads/intake-token";

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const SOURCE_ID = "source-1";

type QueryResult = { data: unknown; error: unknown };

function createServiceRoleMock() {
  const inserts: Array<{ table: string; payload: unknown }> = [];
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

    const builder = {
      select() {
        return builder;
      },
      eq() {
        return builder;
      },
      insert(payload: unknown) {
        op = "insert";
        inserts.push({ table, payload });
        return builder;
      },
      update() {
        op = "update";
        return builder;
      },
      delete() {
        op = "delete";
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
    inserts,
    fromTables,
    setResult(table: string, op: string, result: QueryResult) {
      defaults[key(table, op)] = result;
    },
  };
}

describe("createLeadIntakeSource", () => {
  beforeEach(() => {
    mocks.revalidatePath.mockReset();
    mocks.requireAdminAccountId.mockReset();
    mocks.createServiceRoleClient.mockReset();
    mocks.createClient.mockReset();
    mocks.requireAdminAccountId.mockResolvedValue(ACCOUNT_ID);
  });

  test("throws Name is required for an empty name before minting or inserting", async () => {
    await expect(createLeadIntakeSource("")).rejects.toThrow("Name is required");

    expect(mocks.requireAdminAccountId).toHaveBeenCalledTimes(1);
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled();
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  test("throws Name is required for a whitespace name before minting or inserting", async () => {
    await expect(createLeadIntakeSource("   \t  ")).rejects.toThrow(
      "Name is required",
    );

    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  test("trims the name, stores only the token hash, and returns a well-formed token", async () => {
    const supabase = createServiceRoleMock();
    supabase.setResult("lead_intake_sources", "insert", {
      data: { id: SOURCE_ID },
      error: null,
    });
    mocks.createServiceRoleClient.mockReturnValue(supabase);

    const result = await createLeadIntakeSource("  Webhook  ");

    expect(mocks.createServiceRoleClient).toHaveBeenCalled();
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(result.id).toBe(SOURCE_ID);
    expect(isWellFormedIntakeToken(result.token)).toBe(true);

    expect(supabase.inserts).toHaveLength(1);
    expect(supabase.inserts[0]?.table).toBe("lead_intake_sources");
    const payload = supabase.inserts[0]?.payload as Record<string, unknown>;
    expect(payload).toEqual({
      account_id: ACCOUNT_ID,
      name: "Webhook",
      token_hash: hashIntakeToken(result.token),
    });
    expect(payload).not.toHaveProperty("token");
    expect(payload.token_hash).not.toBe(result.token);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/settings/integrations");
  });

  test("throws the supabase insert error message", async () => {
    const supabase = createServiceRoleMock();
    supabase.setResult("lead_intake_sources", "insert", {
      data: null,
      error: { message: "duplicate key" },
    });
    mocks.createServiceRoleClient.mockReturnValue(supabase);

    await expect(createLeadIntakeSource("Webhook")).rejects.toThrow(
      "duplicate key",
    );

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  test("throws Could not create intake source when insert returns no data", async () => {
    const supabase = createServiceRoleMock();
    supabase.setResult("lead_intake_sources", "insert", {
      data: null,
      error: null,
    });
    mocks.createServiceRoleClient.mockReturnValue(supabase);

    await expect(createLeadIntakeSource("Webhook")).rejects.toThrow(
      "Could not create intake source",
    );

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
