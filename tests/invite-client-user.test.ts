import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { hashInviteAuthToken } from "@/lib/auth/invite-token";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requireAdminAccountId: vi.fn(),
  requireUserId: vi.fn(),
  requireWritableBilling: vi.fn(),
  createClient: vi.fn(),
  createServiceRoleClient: vi.fn(),
  canSendBrandedAuthEmail: vi.fn(),
  buildVerificationLink: vi.fn(),
  getGeneratedTokenHash: vi.fn(),
  sendClientPortalInvitationEmail: vi.fn(),
  generateLink: vi.fn(),
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

vi.mock("@/lib/email/auth-emails", () => ({
  canSendBrandedAuthEmail: mocks.canSendBrandedAuthEmail,
  buildVerificationLink: mocks.buildVerificationLink,
  getGeneratedTokenHash: mocks.getGeneratedTokenHash,
  sendClientPortalInvitationEmail: mocks.sendClientPortalInvitationEmail,
}));

import { inviteClientUser } from "@/lib/actions/clients";

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "user-1";
const CLIENT_ID = "22222222-2222-4222-8222-222222222222";
const INVITE_ID = "invite-1";
const TOKEN_HASH = "invite-hashed-token";
const ORIGIN = "https://app.example.com";
const ACCOUNT_NAME = "Acme";
const CLIENT_NAME = "Northwind";
const CLIENT_EMAIL = "client@example.com";

type QueryResult = { data: unknown; error: unknown };

function createSupabaseMock() {
  const inserts: Array<{ table: string; payload: unknown }> = [];
  const updates: Array<{
    table: string;
    payload: unknown;
    eqs: Array<[string, unknown]>;
  }> = [];
  const deletes: Array<{
    table: string;
    eqs: Array<[string, unknown]>;
  }> = [];
  const selects: Array<{
    table: string;
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
      delete() {
        op = "delete";
        deletes.push({ table, eqs });
        return builder;
      },
      single: async () => {
        if (op === "select") {
          selects.push({ table, eqs: [...eqs] });
        }
        return take(table, op);
      },
      maybeSingle: async () => {
        if (op === "select") {
          selects.push({ table, eqs: [...eqs] });
        }
        return take(table, op);
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
    auth: { admin: { generateLink: mocks.generateLink } },
    from,
    inserts,
    updates,
    deletes,
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

function generatedToken(value: unknown): string | null {
  if (!value || typeof value !== "object" || !("properties" in value)) {
    return null;
  }
  const properties = (value as { properties?: { hashed_token?: unknown } })
    .properties;
  return typeof properties?.hashed_token === "string"
    ? properties.hashed_token
    : null;
}

const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const originalVercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;

describe("inviteClientUser", () => {
  beforeEach(() => {
    mocks.revalidatePath.mockReset();
    mocks.requireAdminAccountId.mockReset();
    mocks.requireUserId.mockReset();
    mocks.requireWritableBilling.mockReset();
    mocks.createClient.mockReset();
    mocks.createServiceRoleClient.mockReset();
    mocks.canSendBrandedAuthEmail.mockReset();
    mocks.buildVerificationLink.mockReset();
    mocks.getGeneratedTokenHash.mockReset();
    mocks.sendClientPortalInvitationEmail.mockReset();
    mocks.generateLink.mockReset();
    mocks.requireAdminAccountId.mockResolvedValue(ACCOUNT_ID);
    mocks.requireWritableBilling.mockResolvedValue(undefined);
    mocks.requireUserId.mockResolvedValue(USER_ID);
    mocks.canSendBrandedAuthEmail.mockReturnValue(true);
    mocks.buildVerificationLink.mockImplementation(
      (redirectTo: string, tokenHash: string, type: string) =>
        `${redirectTo}#${type}:${tokenHash}`,
    );
    mocks.getGeneratedTokenHash.mockImplementation(generatedToken);
    mocks.sendClientPortalInvitationEmail.mockResolvedValue(undefined);
    mocks.generateLink.mockResolvedValue({
      data: { properties: { hashed_token: TOKEN_HASH } },
      error: null,
    });
    process.env.NEXT_PUBLIC_SITE_URL = ORIGIN;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
  });

  afterEach(() => {
    if (originalSiteUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
    }
    if (originalVercelUrl === undefined) {
      delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    } else {
      process.env.VERCEL_PROJECT_PRODUCTION_URL = originalVercelUrl;
    }
  });

  function mockClients(options?: {
    account?: QueryResult;
    client?: QueryResult;
    enqueueInviteInsert?: QueryResult;
    inviteUpdate?: QueryResult;
    inviteDelete?: QueryResult;
  }) {
    const user = createSupabaseMock();
    user.setResult(
      "accounts",
      "select",
      options?.account ?? { data: { name: ACCOUNT_NAME }, error: null },
    );
    user.setResult(
      "clients",
      "select",
      options?.client ?? {
        data: { id: CLIENT_ID, name: CLIENT_NAME },
        error: null,
      },
    );
    const serviceRole = createSupabaseMock();
    serviceRole.enqueue(
      "invites",
      "insert",
      options?.enqueueInviteInsert ?? { data: { id: INVITE_ID }, error: null },
    );
    serviceRole.setResult(
      "invites",
      "update",
      options?.inviteUpdate ?? { data: null, error: null },
    );
    serviceRole.setResult(
      "invites",
      "delete",
      options?.inviteDelete ?? { data: null, error: null },
    );
    mocks.createClient.mockResolvedValue(user);
    mocks.createServiceRoleClient.mockReturnValue(serviceRole);
    return { user, serviceRole };
  }

  test("invalid email fails schema before admin lookup", async () => {
    await expect(
      inviteClientUser(CLIENT_ID, { email: "not-an-email" }),
    ).rejects.toThrow();

    expect(mocks.requireAdminAccountId).not.toHaveBeenCalled();
    expect(mocks.requireWritableBilling).not.toHaveBeenCalled();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  test("throws Client not found for a missing client and does not insert an invite", async () => {
    const { user, serviceRole } = mockClients({
      client: { data: null, error: null },
    });

    await expect(
      inviteClientUser(CLIENT_ID, { email: CLIENT_EMAIL }),
    ).rejects.toThrow("Client not found");

    expect(user.selects).toContainEqual({
      table: "clients",
      eqs: [
        ["id", CLIENT_ID],
        ["account_id", ACCOUNT_ID],
      ],
    });
    expect(serviceRole.inserts).toEqual([]);
    expect(mocks.generateLink).not.toHaveBeenCalled();
  });

  test("throws Client not found when the client belongs to another account", async () => {
    const { user, serviceRole } = mockClients({
      client: { data: null, error: null },
    });

    await expect(
      inviteClientUser(CLIENT_ID, { email: CLIENT_EMAIL }),
    ).rejects.toThrow("Client not found");

    expect(user.selects).toContainEqual({
      table: "clients",
      eqs: [
        ["id", CLIENT_ID],
        ["account_id", ACCOUNT_ID],
      ],
    });
    expect(serviceRole.inserts).toEqual([]);
  });

  test("throws Account not found and does not insert an invite", async () => {
    const { user, serviceRole } = mockClients({
      account: { data: null, error: null },
    });

    await expect(
      inviteClientUser(CLIENT_ID, { email: CLIENT_EMAIL }),
    ).rejects.toThrow("Account not found");

    expect(user.selects.map((row) => row.table)).toEqual(["accounts"]);
    expect(serviceRole.inserts).toEqual([]);
  });

  test("throws Invite email is not configured after account and client are found", async () => {
    mocks.canSendBrandedAuthEmail.mockReturnValue(false);
    const { user, serviceRole } = mockClients();

    await expect(
      inviteClientUser(CLIENT_ID, { email: CLIENT_EMAIL }),
    ).rejects.toThrow("Invite email is not configured.");

    expect(user.selects).toEqual([
      { table: "accounts", eqs: [["id", ACCOUNT_ID]] },
      {
        table: "clients",
        eqs: [
          ["id", CLIENT_ID],
          ["account_id", ACCOUNT_ID],
        ],
      },
    ]);
    expect(serviceRole.inserts).toEqual([]);
    expect(mocks.sendClientPortalInvitationEmail).not.toHaveBeenCalled();
  });

  test("deletes the inserted invite when generateLink fails", async () => {
    const { serviceRole } = mockClients();
    mocks.generateLink.mockResolvedValue({
      data: null,
      error: { message: "invite link failed" },
    });

    await expect(
      inviteClientUser(CLIENT_ID, { email: CLIENT_EMAIL }),
    ).rejects.toThrow("invite link failed");

    expect(serviceRole.deletes).toEqual([
      { table: "invites", eqs: [["id", INVITE_ID]] },
    ]);
    expect(mocks.sendClientPortalInvitationEmail).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  test("inserts a client-role invite, sends the portal email, and revalidates only the client page", async () => {
    const { serviceRole } = mockClients();
    const redirectTo = `${ORIGIN}/auth/callback`;

    await inviteClientUser(CLIENT_ID, { email: CLIENT_EMAIL });

    expect(serviceRole.inserts).toEqual([
      {
        table: "invites",
        payload: {
          account_id: ACCOUNT_ID,
          email: CLIENT_EMAIL,
          role: "client",
          client_id: CLIENT_ID,
          invited_by: USER_ID,
        },
      },
    ]);
    expect(serviceRole.updates).toEqual([
      {
        table: "invites",
        payload: { auth_token_hash: hashInviteAuthToken(TOKEN_HASH) },
        eqs: [["id", INVITE_ID]],
      },
    ]);
    expect(mocks.sendClientPortalInvitationEmail).toHaveBeenCalledWith({
      to: CLIENT_EMAIL,
      actionLink: `${redirectTo}#invite:${TOKEN_HASH}`,
      accountName: ACCOUNT_NAME,
    });
    expect(mocks.revalidatePath).toHaveBeenCalledTimes(1);
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      `/team/clients/${CLIENT_ID}`,
    );
    expect(mocks.revalidatePath).not.toHaveBeenCalledWith("/team");
  });

  test("throws a bind error on auth_token_hash update and does not send", async () => {
    const { serviceRole } = mockClients({
      inviteUpdate: { data: null, error: { message: "bind failed" } },
    });

    await expect(
      inviteClientUser(CLIENT_ID, { email: CLIENT_EMAIL }),
    ).rejects.toThrow("bind failed");

    expect(serviceRole.updates).toHaveLength(1);
    expect(mocks.sendClientPortalInvitationEmail).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
