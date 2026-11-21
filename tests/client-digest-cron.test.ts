import { beforeEach, describe, expect, test, vi } from "vitest";

import type { BillingAccountRow } from "@/lib/billing/access";
import { formatFromAddress } from "@/lib/email/account-settings";
import { formatWorkspaceCurrency } from "@/lib/workspace-settings";

const mocks = vi.hoisted(() => ({
  isAuthorizedCronRequest: vi.fn(),
  createServiceRoleClient: vi.fn(),
  getAccountEmailSettings: vi.fn(),
  getWorkspaceSettingsForAccount: vi.fn(),
  getResendClient: vi.fn(),
  send: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/cron/authorize", () => ({
  isAuthorizedCronRequest: mocks.isAuthorizedCronRequest,
}));

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/email/account-settings", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/email/account-settings")>();
  return {
    ...actual,
    getAccountEmailSettings: mocks.getAccountEmailSettings,
  };
});

vi.mock("@/lib/queries/workspace-settings", () => ({
  getWorkspaceSettingsForAccount: mocks.getWorkspaceSettingsForAccount,
}));

vi.mock("@/lib/resend/client", () => ({
  getResendClient: mocks.getResendClient,
}));

const { GET } = await import("@/app/api/cron/client-digest/route");

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const ACCOUNT_B = "22222222-2222-4222-8222-222222222222";
const CLIENT_ID = "client-1";
const CLIENT_B = "client-2";
const OTHER_CLIENT_ID = "client-other";

type QueryResult = { data: unknown; error: unknown; count?: number | null };

function writableBilling(
  accountId = ACCOUNT_ID,
  overrides: Partial<BillingAccountRow> = {},
): BillingAccountRow {
  return {
    account_id: accountId,
    source: "polar",
    plan_key: "team",
    provider_status: "active",
    polar_customer_id: null,
    polar_subscription_id: null,
    seats: 5,
    current_period_start: null,
    current_period_end: null,
    trial_start: null,
    trial_end: null,
    cancel_at_period_end: false,
    past_due_since: null,
    last_provider_modified_at: null,
    ...overrides,
  };
}

function readyEmail(overrides: Record<string, unknown> = {}) {
  return {
    account_id: ACCOUNT_ID,
    sending_domain: "example.com",
    from_email: "team@example.com",
    from_name: "Team",
    domain_verification_status: "verified",
    outbound_suspended: false,
    ...overrides,
  };
}

function digestClient(overrides: Record<string, unknown> = {}) {
  return {
    id: CLIENT_ID,
    account_id: ACCOUNT_ID,
    name: "River Holdings",
    contact_email: "owner@client.test",
    ...overrides,
  };
}

function pendingLead(overrides: Record<string, unknown> = {}) {
  return {
    id: "lead-1",
    title: "123 Main St",
    property: [{ asking_price: 250000, condition: "fair" }],
    ...overrides,
  };
}

const USD_WORKSPACE = {
  id: ACCOUNT_ID,
  name: "Acme",
  timezone: null,
  currencyCode: "USD" as const,
  dateFormat: "system" as const,
  timeFormat: "system" as const,
  updatedAt: "2026-11-21T10:00:00.000Z",
};

function createServiceRoleMock() {
  const selects: Array<{
    table: string;
    eqs: Array<[string, unknown]>;
    isFilters: Array<[string, unknown]>;
  }> = [];
  const rpcCalls: Array<{ fn: string; args: unknown }> = [];
  const fromTables: string[] = [];
  const queues: Record<string, QueryResult[]> = {};
  const defaults: Record<string, QueryResult> = {};
  const rpcQueue: QueryResult[] = [];

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
    const op = "select";
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
      then(
        onFulfilled: (value: QueryResult) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) {
        selects.push({ table, eqs: [...eqs], isFilters: [...isFilters] });
        return Promise.resolve(take(table, op)).then(onFulfilled, onRejected);
      },
    };

    return builder;
  }

  async function rpc(fn: string, args: unknown) {
    rpcCalls.push({ fn, args });
    if (rpcQueue.length > 0) {
      return rpcQueue.shift()!;
    }
    return { data: [], error: null };
  }

  return {
    from,
    rpc,
    selects,
    rpcCalls,
    fromTables,
    setResult(table: string, op: string, result: QueryResult) {
      defaults[key(table, op)] = result;
    },
    enqueue(table: string, op: string, result: QueryResult) {
      const k = key(table, op);
      queues[k] ??= [];
      queues[k].push(result);
    },
    enqueueRpc(result: QueryResult) {
      rpcQueue.push(result);
    },
  };
}

async function getDigest(): Promise<Response> {
  return GET(new Request("http://localhost/api/cron/client-digest"));
}

describe("GET /api/cron/client-digest", () => {
  beforeEach(() => {
    mocks.isAuthorizedCronRequest.mockReset();
    mocks.createServiceRoleClient.mockReset();
    mocks.getAccountEmailSettings.mockReset();
    mocks.getWorkspaceSettingsForAccount.mockReset();
    mocks.getResendClient.mockReset();
    mocks.send.mockReset();
    mocks.isAuthorizedCronRequest.mockReturnValue(true);
    mocks.getAccountEmailSettings.mockResolvedValue(readyEmail());
    mocks.getWorkspaceSettingsForAccount.mockResolvedValue(USD_WORKSPACE);
    mocks.send.mockResolvedValue({ data: { id: "email-1" }, error: null });
    mocks.getResendClient.mockReturnValue({ emails: { send: mocks.send } });
  });

  test("returns 401 and does not create a service-role client or send when unauthorized", async () => {
    mocks.isAuthorizedCronRequest.mockReturnValue(false);

    const response = await getDigest();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled();
    expect(mocks.getResendClient).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });

  test("skips a client whose billing row is not writable and does not send", async () => {
    const supabase = createServiceRoleMock();
    supabase.setResult("billing_accounts", "select", {
      data: [writableBilling(ACCOUNT_ID, { source: "none", plan_key: null })],
      error: null,
    });
    supabase.setResult("clients", "select", {
      data: [digestClient()],
      error: null,
    });
    mocks.createServiceRoleClient.mockReturnValue(supabase);

    const response = await getDigest();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      sent: 0,
      skipped: 1,
      failed: 0,
    });
    expect(supabase.fromTables).not.toContain("leads");
    expect(mocks.getAccountEmailSettings).not.toHaveBeenCalled();
    expect(mocks.getResendClient).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });

  test.each([
    [
      "unverified domain",
      readyEmail({ domain_verification_status: "pending" }),
    ],
    [
      "from-email domain mismatch",
      readyEmail({ from_email: "team@other.com" }),
    ],
  ])(
    "skips when pending leads exist but email settings are not ready (%s)",
    async (_label, emailSettings) => {
      const supabase = createServiceRoleMock();
      supabase.setResult("billing_accounts", "select", {
        data: [writableBilling()],
        error: null,
      });
      supabase.setResult("clients", "select", {
        data: [digestClient()],
        error: null,
      });
      supabase.enqueue("leads", "select", {
        data: [pendingLead()],
        error: null,
      });
      mocks.getAccountEmailSettings.mockResolvedValue(emailSettings);
      mocks.createServiceRoleClient.mockReturnValue(supabase);

      const response = await getDigest();

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        sent: 0,
        skipped: 1,
        failed: 0,
      });
      expect(supabase.rpcCalls).toEqual([]);
      expect(mocks.getResendClient).not.toHaveBeenCalled();
      expect(mocks.send).not.toHaveBeenCalled();
    },
  );

  test.each([null, ""])(
    "skips when email is ready but there are no portal members and contact_email is %s",
    async (contactEmail) => {
      const supabase = createServiceRoleMock();
      supabase.setResult("billing_accounts", "select", {
        data: [writableBilling()],
        error: null,
      });
      supabase.setResult("clients", "select", {
        data: [digestClient({ contact_email: contactEmail })],
        error: null,
      });
      supabase.enqueue("leads", "select", {
        data: [pendingLead()],
        error: null,
      });
      supabase.enqueueRpc({ data: [], error: null });
      mocks.createServiceRoleClient.mockReturnValue(supabase);

      const response = await getDigest();

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        sent: 0,
        skipped: 1,
        failed: 0,
      });
      expect(mocks.getResendClient).not.toHaveBeenCalled();
      expect(mocks.send).not.toHaveBeenCalled();
    },
  );

  test("sends to portal members for this client with a singular subject and formatted USD price", async () => {
    const emailSettings = readyEmail();
    const supabase = createServiceRoleMock();
    supabase.setResult("billing_accounts", "select", {
      data: [writableBilling()],
      error: null,
    });
    supabase.setResult("clients", "select", {
      data: [digestClient()],
      error: null,
    });
    supabase.enqueue("leads", "select", {
      data: [pendingLead()],
      error: null,
    });
    supabase.enqueueRpc({
      data: [
        { client_id: CLIENT_ID, email: "member-a@client.test" },
        { client_id: CLIENT_ID, email: "member-b@client.test" },
        { client_id: OTHER_CLIENT_ID, email: "other@client.test" },
      ],
      error: null,
    });
    mocks.getAccountEmailSettings.mockResolvedValue(emailSettings);
    mocks.createServiceRoleClient.mockReturnValue(supabase);

    const response = await getDigest();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      sent: 1,
      skipped: 0,
      failed: 0,
    });

    const leadSelect = supabase.selects.find((select) => select.table === "leads");
    expect(leadSelect?.eqs).toEqual([
      ["account_id", ACCOUNT_ID],
      ["client_id", CLIENT_ID],
      ["client_interest_status", "pending"],
    ]);
    expect(leadSelect?.isFilters).toEqual([["deleted_at", null]]);
    expect(supabase.rpcCalls).toEqual([
      {
        fn: "get_client_portal_members",
        args: { p_account_id: ACCOUNT_ID },
      },
    ]);

    const price = formatWorkspaceCurrency(250000, USD_WORKSPACE, "en-US");
    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(mocks.send).toHaveBeenCalledWith({
      from: formatFromAddress(emailSettings),
      to: ["member-a@client.test", "member-b@client.test"],
      subject: "1 property waiting on your review",
      text: expect.stringContaining(`123 Main St — ${price} — fair`),
    });
    expect(mocks.send.mock.calls[0]?.[0].to).not.toContain("other@client.test");
    expect(mocks.send.mock.calls[0]?.[0].from).toBe("Team <team@example.com>");
  });

  test("falls back to contact_email when there are no portal members", async () => {
    const supabase = createServiceRoleMock();
    supabase.setResult("billing_accounts", "select", {
      data: [writableBilling()],
      error: null,
    });
    supabase.setResult("clients", "select", {
      data: [digestClient()],
      error: null,
    });
    supabase.enqueue("leads", "select", {
      data: [pendingLead()],
      error: null,
    });
    supabase.enqueueRpc({ data: [], error: null });
    mocks.createServiceRoleClient.mockReturnValue(supabase);

    const response = await getDigest();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      sent: 1,
      skipped: 0,
      failed: 0,
    });
    expect(mocks.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["owner@client.test"],
      }),
    );
  });

  test("uses a plural subject and both property join shapes for two pending leads", async () => {
    const supabase = createServiceRoleMock();
    supabase.setResult("billing_accounts", "select", {
      data: [writableBilling()],
      error: null,
    });
    supabase.setResult("clients", "select", {
      data: [digestClient()],
      error: null,
    });
    supabase.enqueue("leads", "select", {
      data: [
        pendingLead(),
        {
          id: "lead-2",
          title: "99 Oak Ave",
          property: { asking_price: 100000, condition: "poor" },
        },
      ],
      error: null,
    });
    supabase.enqueueRpc({
      data: [{ client_id: CLIENT_ID, email: "member@client.test" }],
      error: null,
    });
    mocks.createServiceRoleClient.mockReturnValue(supabase);

    const response = await getDigest();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      sent: 1,
      skipped: 0,
      failed: 0,
    });
    const firstPrice = formatWorkspaceCurrency(250000, USD_WORKSPACE, "en-US");
    const secondPrice = formatWorkspaceCurrency(100000, USD_WORKSPACE, "en-US");
    const text = mocks.send.mock.calls[0]?.[0].text as string;
    expect(mocks.send).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "2 properties waiting on your review",
      }),
    );
    expect(text).toContain(`123 Main St — ${firstPrice} — fair`);
    expect(text).toContain(`99 Oak Ave — ${secondPrice} — poor`);
  });

  test("fail-soft: a Resend error on the first client still sends the second", async () => {
    const supabase = createServiceRoleMock();
    supabase.setResult("billing_accounts", "select", {
      data: [writableBilling(ACCOUNT_ID), writableBilling(ACCOUNT_B)],
      error: null,
    });
    supabase.setResult("clients", "select", {
      data: [
        digestClient(),
        digestClient({
          id: CLIENT_B,
          account_id: ACCOUNT_B,
          name: "Oak Partners",
          contact_email: "oak@client.test",
        }),
      ],
      error: null,
    });
    supabase.enqueue("leads", "select", {
      data: [pendingLead()],
      error: null,
    });
    supabase.enqueue("leads", "select", {
      data: [pendingLead({ id: "lead-2", title: "50 Pine Rd" })],
      error: null,
    });
    mocks.send
      .mockResolvedValueOnce({ error: { message: "boom" } })
      .mockResolvedValueOnce({ data: { id: "email-2" }, error: null });
    mocks.createServiceRoleClient.mockReturnValue(supabase);

    const response = await getDigest();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      sent: 1,
      skipped: 0,
      failed: 1,
    });
    expect(mocks.send).toHaveBeenCalledTimes(2);
    expect(mocks.send.mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({
        to: ["oak@client.test"],
        subject: "1 property waiting on your review",
      }),
    );
  });

  test("still sends when outbound_suspended is true because isAccountEmailReady does not check it", async () => {
    const supabase = createServiceRoleMock();
    supabase.setResult("billing_accounts", "select", {
      data: [writableBilling()],
      error: null,
    });
    supabase.setResult("clients", "select", {
      data: [digestClient()],
      error: null,
    });
    supabase.enqueue("leads", "select", {
      data: [pendingLead()],
      error: null,
    });
    mocks.getAccountEmailSettings.mockResolvedValue(
      readyEmail({ outbound_suspended: true }),
    );
    mocks.createServiceRoleClient.mockReturnValue(supabase);

    const response = await getDigest();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      sent: 1,
      skipped: 0,
      failed: 0,
    });
    expect(mocks.send).toHaveBeenCalledTimes(1);
  });
});
