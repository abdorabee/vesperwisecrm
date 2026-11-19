import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requireAccountId: vi.fn(),
  requireAdminAccountId: vi.fn(),
  requireUserId: vi.fn(),
  requireWritableBilling: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/supabase/account", () => ({
  requireAccountId: mocks.requireAccountId,
  requireAdminAccountId: mocks.requireAdminAccountId,
  requireUserId: mocks.requireUserId,
}));

vi.mock("@/lib/billing/access", () => ({
  requireWritableBilling: mocks.requireWritableBilling,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

import { assignLeadToClient, saveClient } from "@/lib/actions/clients";

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const LEAD_ID = "lead-1";
const CLIENT_ID = "client-1";

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
    updates,
    fromTables,
    setResult(table: string, op: string, result: QueryResult) {
      defaults[key(table, op)] = result;
    },
  };
}

describe("assignLeadToClient", () => {
  beforeEach(() => {
    mocks.revalidatePath.mockReset();
    mocks.requireAccountId.mockReset();
    mocks.requireAdminAccountId.mockReset();
    mocks.requireUserId.mockReset();
    mocks.requireWritableBilling.mockReset();
    mocks.createClient.mockReset();
    mocks.requireAccountId.mockResolvedValue(ACCOUNT_ID);
    mocks.requireWritableBilling.mockResolvedValue(undefined);
  });

  test("throws Client not found and does not update the lead", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("clients", "select", { data: null, error: null });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(assignLeadToClient(LEAD_ID, CLIENT_ID)).rejects.toThrow(
      "Client not found",
    );

    expect(supabase.updates).toEqual([]);
    expect(supabase.inserts).toEqual([]);
  });

  test("sets pending interest and records client_assigned with the client id", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("clients", "select", {
      data: { id: CLIENT_ID },
      error: null,
    });
    supabase.setResult("leads", "update", {
      data: [{ id: LEAD_ID }],
      error: null,
    });
    mocks.createClient.mockResolvedValue(supabase);

    await assignLeadToClient(LEAD_ID, CLIENT_ID);

    expect(supabase.updates).toEqual([
      {
        table: "leads",
        payload: {
          client_id: CLIENT_ID,
          client_interest_status: "pending",
          client_decided_at: null,
        },
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
          type: "client_assigned",
          payload: { client_id: CLIENT_ID },
        },
      },
    ]);
  });

  test("skips the clients lookup when clientId is null and records a null payload", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("leads", "update", {
      data: [{ id: LEAD_ID }],
      error: null,
    });
    mocks.createClient.mockResolvedValue(supabase);

    await assignLeadToClient(LEAD_ID, null);

    expect(supabase.fromTables).not.toContain("clients");
    expect(supabase.updates[0]?.payload).toEqual({
      client_id: null,
      client_interest_status: null,
      client_decided_at: null,
    });
    expect(supabase.inserts[0]?.payload).toEqual(
      expect.objectContaining({
        type: "client_assigned",
        payload: { client_id: null },
      }),
    );
  });

  test("throws Lead not found when the update matches no rows and does not insert activity", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("leads", "update", { data: [], error: null });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(assignLeadToClient(LEAD_ID, null)).rejects.toThrow(
      "Lead not found",
    );

    expect(supabase.inserts).toEqual([]);
  });
});

describe("saveClient", () => {
  beforeEach(() => {
    mocks.revalidatePath.mockReset();
    mocks.requireAccountId.mockReset();
    mocks.requireAdminAccountId.mockReset();
    mocks.requireUserId.mockReset();
    mocks.requireWritableBilling.mockReset();
    mocks.createClient.mockReset();
    mocks.requireAdminAccountId.mockResolvedValue(ACCOUNT_ID);
    mocks.requireWritableBilling.mockResolvedValue(undefined);
  });

  test("stores whitespace optional fields as null and requires admin plus writable billing", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("clients", "insert", {
      data: { id: CLIENT_ID },
      error: null,
    });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(
      saveClient({
        name: "Acme",
        contactEmail: "",
        contactPhone: "   ",
        notes: "  ",
      }),
    ).resolves.toEqual({ clientId: CLIENT_ID });

    expect(mocks.requireAdminAccountId).toHaveBeenCalled();
    expect(mocks.requireWritableBilling).toHaveBeenCalledWith(ACCOUNT_ID);
    expect(supabase.inserts).toEqual([
      {
        table: "clients",
        payload: {
          account_id: ACCOUNT_ID,
          name: "Acme",
          contact_email: null,
          contact_phone: null,
          notes: null,
        },
      },
    ]);
  });

  test("stores a whitespace driveFolderId as null on update", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("clients", "update", { data: null, error: null });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(
      saveClient(
        {
          name: "Acme",
          driveFolderId: "   ",
        },
        CLIENT_ID,
      ),
    ).resolves.toEqual({ clientId: CLIENT_ID });

    expect(supabase.updates).toHaveLength(1);
    expect(supabase.updates[0]?.payload).toEqual(
      expect.objectContaining({
        name: "Acme",
        drive_folder_id: null,
      }),
    );
  });
});
