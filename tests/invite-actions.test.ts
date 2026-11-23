import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { hashInviteAuthToken } from "@/lib/auth/invite-token";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requireAdminAccountId: vi.fn(),
  requireUserId: vi.fn(),
  requireWritableBilling: vi.fn(),
  getBillingSummary: vi.fn(),
  createClient: vi.fn(),
  createServiceRoleClient: vi.fn(),
  canSendBrandedAuthEmail: vi.fn(),
  buildVerificationLink: vi.fn(),
  getGeneratedTokenHash: vi.fn(),
  sendTeamInvitationEmail: vi.fn(),
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
  getBillingSummary: mocks.getBillingSummary,
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
  sendTeamInvitationEmail: mocks.sendTeamInvitationEmail,
}));

import {
  inviteTeamMember,
  updateMemberRestrictions,
} from "@/lib/actions/team";

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "user-1";
const INVITE_ID = "invite-1";
const TOKEN_HASH = "invite-hashed-token";
const ORIGIN = "https://app.example.com";
const ACCOUNT_NAME = "Acme";
const MEMBER_EMAIL = "member@example.com";

type QueryResult = { data: unknown; error: unknown };

function billingSummary(
  overrides: {
    memberCount?: number;
    pendingInviteCount?: number;
    seats?: number;
  } = {},
) {
  return {
    memberCount: 2,
    pendingInviteCount: 0,
    seats: 3,
    ...overrides,
  };
}

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

describe("updateMemberRestrictions", () => {
  beforeEach(() => {
    mocks.revalidatePath.mockReset();
    mocks.requireAdminAccountId.mockReset();
    mocks.requireUserId.mockReset();
    mocks.requireWritableBilling.mockReset();
    mocks.createClient.mockReset();
    mocks.requireAdminAccountId.mockResolvedValue(ACCOUNT_ID);
    mocks.requireWritableBilling.mockResolvedValue(undefined);
  });

  test("fails schema before admin lookup for invalid leadVisibility", async () => {
    await expect(
      updateMemberRestrictions(USER_ID, {
        leadVisibility: "team",
      } as never),
    ).rejects.toThrow();

    expect(mocks.requireAdminAccountId).not.toHaveBeenCalled();
    expect(mocks.requireWritableBilling).not.toHaveBeenCalled();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  test("persists empty maxOpenLeads and jobFunction as null and revalidates team pages", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("account_members", "update", { data: null, error: null });
    mocks.createClient.mockResolvedValue(supabase);

    await updateMemberRestrictions(USER_ID, {
      leadVisibility: "assigned_only",
      maxOpenLeads: "",
      jobFunction: "",
    });

    expect(mocks.requireAdminAccountId).toHaveBeenCalledTimes(1);
    expect(mocks.requireWritableBilling).toHaveBeenCalledWith(ACCOUNT_ID);
    expect(supabase.updates).toEqual([
      {
        table: "account_members",
        payload: {
          lead_visibility: "assigned_only",
          max_open_leads: null,
          job_function: null,
        },
        eqs: [
          ["account_id", ACCOUNT_ID],
          ["user_id", USER_ID],
        ],
      },
    ]);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/team");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/settings/members");
  });

  test("stores numeric maxOpenLeads and a job_function", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("account_members", "update", { data: null, error: null });
    mocks.createClient.mockResolvedValue(supabase);

    await updateMemberRestrictions(USER_ID, {
      leadVisibility: "all",
      maxOpenLeads: "10",
      jobFunction: "cold_caller",
    });

    expect(supabase.updates[0]?.payload).toEqual({
      lead_visibility: "all",
      max_open_leads: 10,
      job_function: "cold_caller",
    });
  });

  test("throws the update error and does not revalidate", async () => {
    const supabase = createSupabaseMock();
    supabase.setResult("account_members", "update", {
      data: null,
      error: { message: "permission denied" },
    });
    mocks.createClient.mockResolvedValue(supabase);

    await expect(
      updateMemberRestrictions(USER_ID, { leadVisibility: "all" }),
    ).rejects.toThrow("permission denied");

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

describe("inviteTeamMember", () => {
  beforeEach(() => {
    mocks.revalidatePath.mockReset();
    mocks.requireAdminAccountId.mockReset();
    mocks.requireUserId.mockReset();
    mocks.requireWritableBilling.mockReset();
    mocks.getBillingSummary.mockReset();
    mocks.createClient.mockReset();
    mocks.createServiceRoleClient.mockReset();
    mocks.canSendBrandedAuthEmail.mockReset();
    mocks.buildVerificationLink.mockReset();
    mocks.getGeneratedTokenHash.mockReset();
    mocks.sendTeamInvitationEmail.mockReset();
    mocks.generateLink.mockReset();
    mocks.requireAdminAccountId.mockResolvedValue(ACCOUNT_ID);
    mocks.requireWritableBilling.mockResolvedValue(undefined);
    mocks.requireUserId.mockResolvedValue(USER_ID);
    mocks.getBillingSummary.mockResolvedValue(billingSummary());
    mocks.canSendBrandedAuthEmail.mockReturnValue(true);
    mocks.buildVerificationLink.mockImplementation(
      (redirectTo: string, tokenHash: string, type: string) =>
        `${redirectTo}#${type}:${tokenHash}`,
    );
    mocks.getGeneratedTokenHash.mockImplementation(generatedToken);
    mocks.sendTeamInvitationEmail.mockResolvedValue(undefined);
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

  function mockInviteClients(options?: {
    account?: QueryResult;
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

  test("invalid email and owner role fail schema before billing", async () => {
    await expect(
      inviteTeamMember({ email: "not-an-email", role: "member" }),
    ).rejects.toThrow();
    await expect(
      inviteTeamMember({ email: MEMBER_EMAIL, role: "owner" } as never),
    ).rejects.toThrow();

    expect(mocks.requireAdminAccountId).not.toHaveBeenCalled();
    expect(mocks.requireWritableBilling).not.toHaveBeenCalled();
    expect(mocks.getBillingSummary).not.toHaveBeenCalled();
    expect(mocks.requireUserId).not.toHaveBeenCalled();
  });

  test("throws before accounts select when the invite would exceed paid seats", async () => {
    mocks.getBillingSummary.mockResolvedValue(
      billingSummary({ memberCount: 2, pendingInviteCount: 1, seats: 3 }),
    );
    const { user, serviceRole } = mockInviteClients();

    await expect(
      inviteTeamMember({ email: MEMBER_EMAIL, role: "member" }),
    ).rejects.toThrow(
      "This invitation would exceed the workspace's paid seat limit",
    );

    expect(mocks.requireAdminAccountId).toHaveBeenCalledTimes(1);
    expect(mocks.requireWritableBilling).toHaveBeenCalledWith(ACCOUNT_ID);
    expect(mocks.getBillingSummary).toHaveBeenCalledWith(ACCOUNT_ID);
    expect(mocks.requireUserId).not.toHaveBeenCalled();
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled();
    expect(user.fromTables).toEqual([]);
    expect(serviceRole.inserts).toEqual([]);
    expect(mocks.generateLink).not.toHaveBeenCalled();
  });

  test("allows the exact seat boundary of members plus the new invite", async () => {
    mocks.getBillingSummary.mockResolvedValue(
      billingSummary({ memberCount: 2, pendingInviteCount: 0, seats: 3 }),
    );
    mockInviteClients();

    await expect(
      inviteTeamMember({ email: MEMBER_EMAIL, role: "member" }),
    ).resolves.toBeUndefined();

    expect(mocks.requireUserId).toHaveBeenCalledTimes(1);
    expect(mocks.generateLink).toHaveBeenCalled();
  });

  test("throws Invite email is not configured after the account is found", async () => {
    mocks.canSendBrandedAuthEmail.mockReturnValue(false);
    const { user, serviceRole } = mockInviteClients();

    await expect(
      inviteTeamMember({ email: MEMBER_EMAIL, role: "admin" }),
    ).rejects.toThrow("Invite email is not configured.");

    expect(user.selects).toEqual([
      { table: "accounts", eqs: [["id", ACCOUNT_ID]] },
    ]);
    expect(serviceRole.inserts).toEqual([]);
    expect(mocks.generateLink).not.toHaveBeenCalled();
    expect(mocks.sendTeamInvitationEmail).not.toHaveBeenCalled();
  });

  test("throws Account not found and does not insert an invite", async () => {
    const { serviceRole } = mockInviteClients({
      account: { data: null, error: null },
    });

    await expect(
      inviteTeamMember({ email: MEMBER_EMAIL, role: "member" }),
    ).rejects.toThrow("Account not found");

    expect(serviceRole.inserts).toEqual([]);
    expect(mocks.generateLink).not.toHaveBeenCalled();
  });

  test("deletes the inserted invite when generateLink fails", async () => {
    const { serviceRole } = mockInviteClients();
    mocks.generateLink.mockResolvedValue({
      data: null,
      error: { message: "email already registered" },
    });

    await expect(
      inviteTeamMember({ email: MEMBER_EMAIL, role: "member" }),
    ).rejects.toThrow("email already registered");

    expect(serviceRole.inserts).toEqual([
      {
        table: "invites",
        payload: {
          account_id: ACCOUNT_ID,
          email: MEMBER_EMAIL,
          role: "member",
          invited_by: USER_ID,
        },
      },
    ]);
    expect(serviceRole.deletes).toEqual([
      { table: "invites", eqs: [["id", INVITE_ID]] },
    ]);
    expect(mocks.sendTeamInvitationEmail).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  test("deletes the invite when generateLink omits a token hash", async () => {
    const { serviceRole } = mockInviteClients();
    mocks.generateLink.mockResolvedValue({
      data: { properties: {} },
      error: null,
    });

    await expect(
      inviteTeamMember({ email: MEMBER_EMAIL, role: "member" }),
    ).rejects.toThrow("Invite did not return a token hash");

    expect(serviceRole.deletes).toEqual([
      { table: "invites", eqs: [["id", INVITE_ID]] },
    ]);
    expect(mocks.sendTeamInvitationEmail).not.toHaveBeenCalled();
  });

  test("inserts the invite, binds the hashed token, sends email, and revalidates", async () => {
    const { serviceRole } = mockInviteClients();
    const redirectTo = `${ORIGIN}/auth/callback`;

    await inviteTeamMember({ email: MEMBER_EMAIL, role: "admin" });

    expect(mocks.requireAdminAccountId).toHaveBeenCalledTimes(1);
    expect(mocks.requireWritableBilling).toHaveBeenCalledWith(ACCOUNT_ID);
    expect(mocks.requireUserId).toHaveBeenCalledTimes(1);
    expect(serviceRole.inserts).toEqual([
      {
        table: "invites",
        payload: {
          account_id: ACCOUNT_ID,
          email: MEMBER_EMAIL,
          role: "admin",
          invited_by: USER_ID,
        },
      },
    ]);
    expect(mocks.generateLink).toHaveBeenCalledWith({
      type: "invite",
      email: MEMBER_EMAIL,
      options: {
        redirectTo,
        data: { account_name: ACCOUNT_NAME },
      },
    });
    expect(serviceRole.updates).toEqual([
      {
        table: "invites",
        payload: { auth_token_hash: hashInviteAuthToken(TOKEN_HASH) },
        eqs: [["id", INVITE_ID]],
      },
    ]);
    expect(mocks.buildVerificationLink).toHaveBeenCalledWith(
      redirectTo,
      TOKEN_HASH,
      "invite",
    );
    expect(mocks.sendTeamInvitationEmail).toHaveBeenCalledWith({
      to: MEMBER_EMAIL,
      actionLink: `${redirectTo}#invite:${TOKEN_HASH}`,
      accountName: ACCOUNT_NAME,
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/team");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/settings/members");
  });

  test("prefixes https onto VERCEL_PROJECT_PRODUCTION_URL when SITE_URL is unset", async () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "prod.example.com";
    mockInviteClients();

    await inviteTeamMember({ email: MEMBER_EMAIL, role: "member" });

    expect(mocks.generateLink).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          redirectTo: "https://prod.example.com/auth/callback",
        }),
      }),
    );
  });
});
