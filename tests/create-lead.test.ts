import { beforeEach, describe, expect, test, vi } from "vitest";

const emailMocks = vi.hoisted(() => ({
  getAccountEmailSettings: vi.fn(),
  isAccountEmailReady: vi.fn(),
  formatFromAddress: vi.fn(),
  send: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/email/account-settings", () => ({
  getAccountEmailSettings: emailMocks.getAccountEmailSettings,
  isAccountEmailReady: emailMocks.isAccountEmailReady,
  formatFromAddress: emailMocks.formatFromAddress,
}));

vi.mock("@/lib/resend/client", () => ({
  getResendClient: () => ({ emails: { send: emailMocks.send } }),
}));

import { createLeadRecord } from "@/lib/leads/create-lead";

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";

type QueryResult = { data: unknown; error: unknown };

function createSupabaseMock(overrides?: {
  contactsSelect?: QueryResult;
  leadsSelect?: QueryResult;
  rpc?: { data: unknown; error: unknown };
}) {
  const inserts: Array<{ table: string; payload: unknown }> = [];
  const updates: Array<{ table: string; payload: unknown }> = [];
  const fromTables: string[] = [];

  const results: Record<string, Partial<Record<"select" | "insert" | "update", QueryResult>>> =
    {
      pipeline_stages: {
        select: { data: { id: "stage-1" }, error: null },
      },
      contacts: {
        select: overrides?.contactsSelect ?? { data: null, error: null },
        insert: { data: { id: "contact-new" }, error: null },
        update: { data: null, error: null },
      },
      leads: {
        insert: { data: { id: "lead-new" }, error: null },
        select: overrides?.leadsSelect ?? {
          data: {
            title: "123 Main St",
            contact: {
              first_name: "Jane",
              last_name: null,
              email: null,
              phone: null,
              company: null,
              source: null,
            },
          },
          error: null,
        },
      },
      lead_properties: {
        insert: { data: null, error: null },
      },
      activities: {
        insert: { data: null, error: null },
      },
    };

  const rpc = vi.fn(async () => overrides?.rpc ?? { data: [], error: null });

  function from(table: string) {
    fromTables.push(table);
    let op: "select" | "insert" | "update" = "select";

    const resolve = (): QueryResult =>
      results[table]?.[op] ?? { data: null, error: null };

    const builder = {
      select() {
        return builder;
      },
      eq() {
        return builder;
      },
      ilike() {
        return builder;
      },
      is() {
        return builder;
      },
      order() {
        return builder;
      },
      limit() {
        return builder;
      },
      insert(payload: unknown) {
        op = "insert";
        inserts.push({ table, payload });
        return builder;
      },
      update(payload: unknown) {
        op = "update";
        updates.push({ table, payload });
        return builder;
      },
      single: async () => resolve(),
      maybeSingle: async () => resolve(),
      then(
        onFulfilled: (value: QueryResult) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) {
        return Promise.resolve(resolve()).then(onFulfilled, onRejected);
      },
    };

    return builder;
  }

  return {
    from,
    rpc,
    inserts,
    updates,
    fromTables,
  };
}

function baseInput(
  overrides: Partial<Parameters<typeof createLeadRecord>[1]> = {},
) {
  return {
    accountId: ACCOUNT_ID,
    title: "123 Main St",
    firstName: "Jane",
    ...overrides,
  };
}

describe("createLeadRecord", () => {
  beforeEach(() => {
    emailMocks.getAccountEmailSettings.mockReset();
    emailMocks.isAccountEmailReady.mockReset();
    emailMocks.formatFromAddress.mockReset();
    emailMocks.send.mockReset();
    emailMocks.getAccountEmailSettings.mockResolvedValue({
      from_email: "crm@example.com",
      sending_domain: "example.com",
    });
    emailMocks.isAccountEmailReady.mockReturnValue(true);
    emailMocks.formatFromAddress.mockReturnValue("CRM <crm@example.com>");
    emailMocks.send.mockResolvedValue({ id: "email-1" });
  });

  test("skips pipeline_stages when pipelineStageId is provided", async () => {
    const supabase = createSupabaseMock();

    await createLeadRecord(
      supabase as never,
      baseInput({ pipelineStageId: "stage-provided" }),
    );

    expect(supabase.fromTables).not.toContain("pipeline_stages");
    const leadInsert = supabase.inserts.find((row) => row.table === "leads");
    expect(leadInsert?.payload).toEqual(
      expect.objectContaining({ pipeline_stage_id: "stage-provided" }),
    );
  });

  test("sets owner_user_id to actorUserId so assigned_only members own the row", async () => {
    const supabase = createSupabaseMock();

    await createLeadRecord(
      supabase as never,
      baseInput({ actorUserId: "user-1" }),
    );

    const leadInsert = supabase.inserts.find((row) => row.table === "leads");
    expect(leadInsert?.payload).toEqual(
      expect.objectContaining({ owner_user_id: "user-1" }),
    );
  });

  test("trims title and firstName and stores null for empty optional fields", async () => {
    const supabase = createSupabaseMock();

    await createLeadRecord(
      supabase as never,
      baseInput({
        title: "  123 Main St  ",
        firstName: "  Jane  ",
        lastName: "   ",
        email: "",
        phone: "  ",
      }),
    );

    const contactInsert = supabase.inserts.find((row) => row.table === "contacts");
    expect(contactInsert?.payload).toEqual(
      expect.objectContaining({
        first_name: "Jane",
        last_name: null,
        email: null,
        phone: null,
      }),
    );

    const leadInsert = supabase.inserts.find((row) => row.table === "leads");
    expect(leadInsert?.payload).toEqual(
      expect.objectContaining({ title: "123 Main St" }),
    );
  });

  test("reuses an existing contact by email and updates source when it was empty", async () => {
    const supabase = createSupabaseMock({
      contactsSelect: {
        data: { id: "contact-existing", source: null },
        error: null,
      },
    });

    const result = await createLeadRecord(
      supabase as never,
      baseInput({
        email: "jane@example.com",
        source: "Webhook",
      }),
    );

    expect(result.contactId).toBe("contact-existing");
    expect(supabase.inserts.filter((row) => row.table === "contacts")).toEqual([]);
    expect(supabase.updates).toEqual([
      { table: "contacts", payload: { source: "Webhook" } },
    ]);
  });

  test("does not overwrite an existing contact source", async () => {
    const supabase = createSupabaseMock({
      contactsSelect: {
        data: { id: "contact-existing", source: "Existing" },
        error: null,
      },
    });

    const result = await createLeadRecord(
      supabase as never,
      baseInput({
        email: "jane@example.com",
        source: "Webhook",
      }),
    );

    expect(result.contactId).toBe("contact-existing");
    expect(supabase.inserts.filter((row) => row.table === "contacts")).toEqual([]);
    expect(supabase.updates.filter((row) => row.table === "contacts")).toEqual(
      [],
    );
  });

  test("does not insert lead_properties when only contractStatus is none", async () => {
    const supabase = createSupabaseMock();

    await createLeadRecord(
      supabase as never,
      baseInput({ property: { contractStatus: "none" } }),
    );

    expect(
      supabase.inserts.filter((row) => row.table === "lead_properties"),
    ).toEqual([]);
  });

  test("inserts lead_properties with a trimmed address and default contract_status", async () => {
    const supabase = createSupabaseMock();

    await createLeadRecord(
      supabase as never,
      baseInput({ property: { addressLine1: "  123 Main St  " } }),
    );

    const propertyInsert = supabase.inserts.find(
      (row) => row.table === "lead_properties",
    );
    expect(propertyInsert?.payload).toEqual(
      expect.objectContaining({
        address_line1: "123 Main St",
        contract_status: "none",
      }),
    );
  });

  test("always inserts a lead_created activity with the trimmed title", async () => {
    const supabase = createSupabaseMock();

    await createLeadRecord(
      supabase as never,
      baseInput({ title: "  123 Main St  " }),
    );

    const created = supabase.inserts.filter(
      (row) =>
        row.table === "activities" &&
        (row.payload as { type?: string }).type === "lead_created",
    );
    expect(created).toHaveLength(1);
    expect(created[0]?.payload).toEqual(
      expect.objectContaining({
        type: "lead_created",
        payload: expect.objectContaining({ title: "123 Main St" }),
      }),
    );
  });

  test("succeeds when notifyMembers is true and RESEND_API_KEY is unset", async () => {
    const original = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;
    const supabase = createSupabaseMock();

    try {
      await expect(
        createLeadRecord(supabase as never, baseInput({ notifyMembers: true })),
      ).resolves.toEqual({ leadId: "lead-new", contactId: "contact-new" });
      expect(emailMocks.send).not.toHaveBeenCalled();
    } finally {
      if (original === undefined) {
        delete process.env.RESEND_API_KEY;
      } else {
        process.env.RESEND_API_KEY = original;
      }
    }
  });

  test("fail-softs when new-lead notification sending rejects", async () => {
    const original = process.env.RESEND_API_KEY;
    process.env.RESEND_API_KEY = "test-resend-key";
    emailMocks.send.mockRejectedValue(new Error("resend down"));

    const supabase = createSupabaseMock({
      rpc: { data: [{ email: "owner@example.com" }], error: null },
    });

    try {
      await expect(
        createLeadRecord(supabase as never, baseInput({ notifyMembers: true })),
      ).resolves.toEqual({ leadId: "lead-new", contactId: "contact-new" });

      const note = supabase.inserts.find(
        (row) =>
          row.table === "activities" &&
          (row.payload as { type?: string }).type === "note_added",
      );
      expect(note?.payload).toEqual(
        expect.objectContaining({
          type: "note_added",
          payload: expect.objectContaining({
            system: true,
            note: expect.stringContaining("New-lead notification failed"),
          }),
        }),
      );
    } finally {
      if (original === undefined) {
        delete process.env.RESEND_API_KEY;
      } else {
        process.env.RESEND_API_KEY = original;
      }
    }
  });
});
