import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requireAdminAccountId: vi.fn(),
  requireUserId: vi.fn(),
  requireWritableBilling: vi.fn(),
  createClient: vi.fn(),
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

vi.mock("@/lib/google/generate-report", () => ({
  generatePropertyReportDoc: mocks.generatePropertyReportDoc,
}));

vi.mock("@/lib/queries/leads", () => ({
  getLeadDetail: mocks.getLeadDetail,
}));

import { generateLeadReport } from "@/lib/actions/google";

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "user-1";
const LEAD_ID = "lead-1";
const CLIENT_ID = "client-1";
const DOC_URL = "https://docs.google.com/document/d/doc-1/edit";

type QueryResult = { data: unknown; error: unknown };

function createSupabaseMock() {
  const inserts: Array<{ table: string; payload: unknown }> = [];
  const updates: Array<{
    table: string;
    payload: unknown;
    eqs: Array<[string, unknown]>;
  }> = [];
  const fromTables: string[] = [];
  const maybeSingleResults: Record<string, QueryResult> = {};
  const updateResults: Record<string, QueryResult> = {
    leads: { data: [{ id: LEAD_ID }], error: null },
  };

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
      maybeSingle: async () =>
        maybeSingleResults[table] ?? { data: null, error: null },
      then(
        onFulfilled: (value: QueryResult) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) {
        if (op === "update") {
          return Promise.resolve(
            updateResults[table] ?? { data: [{ id: LEAD_ID }], error: null },
          ).then(onFulfilled, onRejected);
        }
        return Promise.resolve({ data: null, error: null }).then(
          onFulfilled,
          onRejected,
        );
      },
    };

    return builder;
  }

  return {
    from,
    inserts,
    updates,
    fromTables,
    setMaybeSingle(table: string, result: QueryResult) {
      maybeSingleResults[table] = result;
    },
    setUpdateResult(table: string, result: QueryResult) {
      updateResults[table] = result;
    },
  };
}

function leadDetail(overrides: { client_id?: string | null } = {}) {
  return {
    id: LEAD_ID,
    title: "123 Main St",
    client_id: overrides.client_id ?? null,
    contact: { first_name: "Jane", last_name: "Doe" },
    property: null,
  };
}

describe("generateLeadReport", () => {
  beforeEach(() => {
    mocks.revalidatePath.mockReset();
    mocks.requireAdminAccountId.mockReset();
    mocks.requireUserId.mockReset();
    mocks.requireWritableBilling.mockReset();
    mocks.createClient.mockReset();
    mocks.generatePropertyReportDoc.mockReset();
    mocks.getLeadDetail.mockReset();
    mocks.requireAdminAccountId.mockResolvedValue(ACCOUNT_ID);
    mocks.requireUserId.mockResolvedValue(USER_ID);
    mocks.requireWritableBilling.mockResolvedValue(undefined);
    mocks.generatePropertyReportDoc.mockResolvedValue(DOC_URL);
    mocks.getLeadDetail.mockResolvedValue(leadDetail());
  });

  test("generates a report with a null folder, persists the url, and records activity", async () => {
    const supabase = createSupabaseMock();
    mocks.createClient.mockResolvedValue(supabase);

    await expect(generateLeadReport(LEAD_ID)).resolves.toEqual({ url: DOC_URL });

    expect(mocks.requireWritableBilling).toHaveBeenCalledWith(ACCOUNT_ID);
    expect(mocks.generatePropertyReportDoc).toHaveBeenCalledWith(
      ACCOUNT_ID,
      expect.objectContaining({ id: LEAD_ID, client_id: null }),
      null,
    );
    expect(supabase.fromTables).not.toContain("clients");
    expect(supabase.updates).toEqual([
      {
        table: "leads",
        payload: { google_doc_url: DOC_URL },
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
          type: "report_generated",
          actor_user_id: USER_ID,
          payload: { url: DOC_URL },
        },
      },
    ]);
    expect(mocks.revalidatePath).toHaveBeenCalledTimes(1);
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/leads/${LEAD_ID}`);
  });

  test("passes the client's drive_folder_id when the lead has a client", async () => {
    const supabase = createSupabaseMock();
    supabase.setMaybeSingle("clients", {
      data: { drive_folder_id: "folder-client" },
      error: null,
    });
    mocks.createClient.mockResolvedValue(supabase);
    mocks.getLeadDetail.mockResolvedValue(leadDetail({ client_id: CLIENT_ID }));

    await generateLeadReport(LEAD_ID);

    expect(mocks.generatePropertyReportDoc).toHaveBeenCalledWith(
      ACCOUNT_ID,
      expect.objectContaining({ client_id: CLIENT_ID }),
      "folder-client",
    );
  });

  test("passes null when the client has no drive_folder_id", async () => {
    const supabase = createSupabaseMock();
    supabase.setMaybeSingle("clients", {
      data: { drive_folder_id: null },
      error: null,
    });
    mocks.createClient.mockResolvedValue(supabase);
    mocks.getLeadDetail.mockResolvedValue(leadDetail({ client_id: CLIENT_ID }));

    await generateLeadReport(LEAD_ID);

    expect(mocks.generatePropertyReportDoc).toHaveBeenCalledWith(
      ACCOUNT_ID,
      expect.anything(),
      null,
    );
  });

  test("throws the lead update error and does not insert activity", async () => {
    const supabase = createSupabaseMock();
    supabase.setUpdateResult("leads", {
      data: null,
      error: { message: "update failed" },
    });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(generateLeadReport(LEAD_ID)).rejects.toThrow("update failed");

    expect(supabase.inserts).toEqual([]);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  test("throws Lead not found when the update matches no rows and does not insert activity", async () => {
    const supabase = createSupabaseMock();
    supabase.setUpdateResult("leads", { data: [], error: null });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(generateLeadReport(LEAD_ID)).rejects.toThrow("Lead not found");

    expect(supabase.inserts).toEqual([]);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
