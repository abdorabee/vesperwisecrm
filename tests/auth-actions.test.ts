import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), {
      digest: `NEXT_REDIRECT;${url}`,
    });
  }),
  headerGet: vi.fn(),
  consumeRateLimit: vi.fn(),
  platformClientIp: vi.fn(),
  getSessionMembership: vi.fn(),
  rememberActiveAccount: vi.fn(),
  createClient: vi.fn(),
  createServiceRoleClient: vi.fn(),
  canSendBrandedAuthEmail: vi.fn(),
  buildVerificationLink: vi.fn(),
  sendSignupConfirmationEmail: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  generateLink: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("next/headers", () => ({
  headers: async () => ({
    get: mocks.headerGet,
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  consumeRateLimit: mocks.consumeRateLimit,
  platformClientIp: mocks.platformClientIp,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}));

vi.mock("@/lib/supabase/account", () => ({
  getSessionMembership: mocks.getSessionMembership,
  rememberActiveAccount: mocks.rememberActiveAccount,
}));

vi.mock("@/lib/email/auth-emails", () => ({
  canSendBrandedAuthEmail: mocks.canSendBrandedAuthEmail,
  buildVerificationLink: mocks.buildVerificationLink,
  sendSignupConfirmationEmail: mocks.sendSignupConfirmationEmail,
}));

import { signIn, signOutAction, signUp } from "@/lib/actions/auth";

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "user-1";
const ORIGIN = "https://app.example.com";
const CLIENT_IP = "203.0.113.9";
const NOW = "2026-11-22T10:00:00.000Z";
const HASHED_TOKEN = "hashed-signup-token";

type QueryResult = { data: unknown; error: unknown };

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    data.set(key, value);
  }
  return data;
}

function redirectUrl(action: Promise<void>): Promise<string> {
  return action.then(
    () => {
      throw new Error("expected redirect");
    },
    (error: unknown) => {
      if (error instanceof Error && error.message === "NEXT_REDIRECT") {
        return String(mocks.redirect.mock.calls.at(-1)?.[0]);
      }
      throw error;
    },
  );
}

function createAuthClient() {
  return {
    auth: {
      signInWithPassword: mocks.signInWithPassword,
      signUp: mocks.signUp,
      signOut: mocks.signOut,
    },
  };
}

function createServiceRoleMock() {
  const updates: Array<{
    table: string;
    payload: unknown;
    eqs: Array<[string, unknown]>;
  }> = [];
  const selects: Array<{
    table: string;
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
      order() {
        return builder;
      },
      limit() {
        return builder;
      },
      update(payload: unknown) {
        op = "update";
        updates.push({ table, payload, eqs });
        return builder;
      },
      maybeSingle: async () => {
        selects.push({ table, eqs: [...eqs] });
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
    updates,
    selects,
    setResult(table: string, op: string, result: QueryResult) {
      defaults[key(table, op)] = result;
    },
  };
}

function signupForm(overrides: Record<string, string> = {}): FormData {
  return form({
    email: "owner@example.com",
    password: "password-1",
    accept_terms: "yes",
    confirm_age: "yes",
    ...overrides,
  });
}

const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const originalVercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;

describe("signIn", () => {
  beforeEach(() => {
    mocks.redirect.mockClear();
    mocks.headerGet.mockReset();
    mocks.getSessionMembership.mockReset();
    mocks.rememberActiveAccount.mockReset();
    mocks.createClient.mockReset();
    mocks.signInWithPassword.mockReset();
    mocks.headerGet.mockImplementation((name: string) =>
      name.toLowerCase() === "origin" ? ORIGIN : null,
    );
    mocks.createClient.mockResolvedValue(createAuthClient());
    mocks.rememberActiveAccount.mockResolvedValue(undefined);
  });

  test("redirects a failed password to login with a safe next and does not remember the account", async () => {
    mocks.signInWithPassword.mockResolvedValue({
      error: { message: "Invalid login credentials" },
    });

    await expect(
      redirectUrl(
        signIn(
          form({
            email: "owner@example.com",
            password: "nope",
            next: "https://evil.example/x",
          }),
        ),
      ),
    ).resolves.toBe(
      `/login?error=${encodeURIComponent("Invalid login credentials")}&next=${encodeURIComponent("/pipeline")}`,
    );

    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: "owner@example.com",
      password: "nope",
    });
    expect(mocks.getSessionMembership).not.toHaveBeenCalled();
    expect(mocks.rememberActiveAccount).not.toHaveBeenCalled();
  });

  test("remembers the membership account and redirects the safe next", async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: null });
    mocks.getSessionMembership.mockResolvedValue({
      accountId: ACCOUNT_ID,
      role: "owner",
      clientId: null,
      onboardingTourCompletedAt: null,
    });

    await expect(
      redirectUrl(
        signIn(
          form({
            email: "owner@example.com",
            password: "password-1",
            next: "/leads/abc",
          }),
        ),
      ),
    ).resolves.toBe("/leads/abc");

    expect(mocks.rememberActiveAccount).toHaveBeenCalledTimes(1);
    expect(mocks.rememberActiveAccount).toHaveBeenCalledWith(ACCOUNT_ID);
  });

  test("redirects the safe next without remembering when there is no membership", async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: null });
    mocks.getSessionMembership.mockResolvedValue(null);

    await expect(
      redirectUrl(
        signIn(
          form({
            email: "owner@example.com",
            password: "password-1",
            next: "/leads/abc",
          }),
        ),
      ),
    ).resolves.toBe("/leads/abc");

    expect(mocks.rememberActiveAccount).not.toHaveBeenCalled();
  });
});

describe("signUp", () => {
  beforeEach(() => {
    mocks.redirect.mockClear();
    mocks.headerGet.mockReset();
    mocks.consumeRateLimit.mockReset();
    mocks.platformClientIp.mockReset();
    mocks.createClient.mockReset();
    mocks.createServiceRoleClient.mockReset();
    mocks.canSendBrandedAuthEmail.mockReset();
    mocks.buildVerificationLink.mockReset();
    mocks.sendSignupConfirmationEmail.mockReset();
    mocks.signUp.mockReset();
    mocks.generateLink.mockReset();
    mocks.headerGet.mockReturnValue(ORIGIN);
    mocks.platformClientIp.mockReturnValue(CLIENT_IP);
    mocks.consumeRateLimit.mockResolvedValue(true);
    mocks.canSendBrandedAuthEmail.mockReturnValue(false);
    mocks.buildVerificationLink.mockImplementation(
      (redirectTo: string, tokenHash: string, type: string) =>
        `${redirectTo}#${type}:${tokenHash}`,
    );
    mocks.sendSignupConfirmationEmail.mockResolvedValue(undefined);
    mocks.createClient.mockResolvedValue(createAuthClient());
    process.env.NEXT_PUBLIC_SITE_URL = ORIGIN;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(NOW));
  });

  afterEach(() => {
    vi.useRealTimers();
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

  test("redirects missing terms before rate limit and includes a team plan", async () => {
    await expect(
      redirectUrl(signUp(signupForm({ accept_terms: "on", plan: "team" }))),
    ).resolves.toBe(
      `/signup?error=${encodeURIComponent("Accept the Terms and Privacy notice to create a workspace.")}&plan=team`,
    );

    expect(mocks.consumeRateLimit).not.toHaveBeenCalled();
    expect(mocks.generateLink).not.toHaveBeenCalled();
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  test("includes starter on the terms error and omits other plan values", async () => {
    await expect(
      redirectUrl(signUp(signupForm({ accept_terms: "no", plan: "starter" }))),
    ).resolves.toContain("&plan=starter");

    await expect(
      redirectUrl(signUp(signupForm({ accept_terms: "no", plan: "enterprise" }))),
    ).resolves.toBe(
      `/signup?error=${encodeURIComponent("Accept the Terms and Privacy notice to create a workspace.")}`,
    );
  });

  test("redirects missing age confirmation before rate limit", async () => {
    await expect(
      redirectUrl(signUp(signupForm({ confirm_age: "on", plan: "team" }))),
    ).resolves.toBe(
      `/signup?error=${encodeURIComponent("Confirm that you are 18 or older to create a workspace.")}&plan=team`,
    );

    expect(mocks.consumeRateLimit).not.toHaveBeenCalled();
  });

  test("redirects too-many without generateLink or signUp", async () => {
    mocks.consumeRateLimit.mockResolvedValue(false);

    await expect(
      redirectUrl(signUp(signupForm({ plan: "team" }))),
    ).resolves.toBe(
      `/signup?error=${encodeURIComponent("Too many signup attempts. Try again later.")}`,
    );

    expect(mocks.consumeRateLimit).toHaveBeenCalledWith({
      scope: "signup",
      identifier: CLIENT_IP,
      limit: 10,
      windowSeconds: 3600,
      failClosed: true,
    });
    expect(mocks.generateLink).not.toHaveBeenCalled();
    expect(mocks.signUp).not.toHaveBeenCalled();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  test("branded generateLink error redirects signupFailure and does not send email", async () => {
    mocks.canSendBrandedAuthEmail.mockReturnValue(true);
    mocks.generateLink.mockResolvedValue({
      data: null,
      error: { message: "email already registered" },
    });
    mocks.createServiceRoleClient.mockReturnValue(createServiceRoleMock());

    await expect(redirectUrl(signUp(signupForm({ plan: "team" })))).resolves.toBe(
      `/signup?error=${encodeURIComponent("email already registered")}&plan=team`,
    );

    expect(mocks.sendSignupConfirmationEmail).not.toHaveBeenCalled();
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  test("branded missing hashed_token redirects without sending email", async () => {
    mocks.canSendBrandedAuthEmail.mockReturnValue(true);
    mocks.generateLink.mockResolvedValue({
      data: { properties: {}, user: { id: USER_ID } },
      error: null,
    });
    mocks.createServiceRoleClient.mockReturnValue(createServiceRoleMock());

    await expect(redirectUrl(signUp(signupForm()))).resolves.toBe(
      `/signup?error=${encodeURIComponent("Failed to create confirmation link")}`,
    );

    expect(mocks.sendSignupConfirmationEmail).not.toHaveBeenCalled();
  });

  test("branded missing user.id redirects without sending email", async () => {
    mocks.canSendBrandedAuthEmail.mockReturnValue(true);
    mocks.generateLink.mockResolvedValue({
      data: { properties: { hashed_token: HASHED_TOKEN }, user: {} },
      error: null,
    });
    mocks.createServiceRoleClient.mockReturnValue(createServiceRoleMock());

    await expect(redirectUrl(signUp(signupForm()))).resolves.toBe(
      `/signup?error=${encodeURIComponent("Failed to create confirmation link")}`,
    );

    expect(mocks.sendSignupConfirmationEmail).not.toHaveBeenCalled();
  });

  test("attestation membership missing redirects signupFailure and does not send", async () => {
    mocks.canSendBrandedAuthEmail.mockReturnValue(true);
    mocks.generateLink.mockResolvedValue({
      data: {
        properties: { hashed_token: HASHED_TOKEN },
        user: { id: USER_ID },
      },
      error: null,
    });
    const serviceRole = createServiceRoleMock();
    serviceRole.setResult("account_members", "select", {
      data: null,
      error: null,
    });
    mocks.createServiceRoleClient.mockReturnValue(serviceRole);

    await expect(redirectUrl(signUp(signupForm({ plan: "starter" })))).resolves.toBe(
      `/signup?error=${encodeURIComponent("Could not record signup attestations")}&plan=starter`,
    );

    expect(mocks.sendSignupConfirmationEmail).not.toHaveBeenCalled();
  });

  test("attestation update error redirects signupFailure and does not send", async () => {
    mocks.canSendBrandedAuthEmail.mockReturnValue(true);
    mocks.generateLink.mockResolvedValue({
      data: {
        properties: { hashed_token: HASHED_TOKEN },
        user: { id: USER_ID },
      },
      error: null,
    });
    const serviceRole = createServiceRoleMock();
    serviceRole.setResult("account_members", "select", {
      data: { account_id: ACCOUNT_ID },
      error: null,
    });
    serviceRole.setResult("accounts", "update", {
      data: null,
      error: { message: "accounts update failed" },
    });
    mocks.createServiceRoleClient.mockReturnValue(serviceRole);

    await expect(redirectUrl(signUp(signupForm()))).resolves.toBe(
      `/signup?error=${encodeURIComponent("accounts update failed")}`,
    );

    expect(mocks.sendSignupConfirmationEmail).not.toHaveBeenCalled();
  });

  test("branded happy path records attestations, sends the verification email, and redirects check-email", async () => {
    mocks.canSendBrandedAuthEmail.mockReturnValue(true);
    mocks.generateLink.mockResolvedValue({
      data: {
        properties: { hashed_token: HASHED_TOKEN },
        user: { id: USER_ID },
      },
      error: null,
    });
    const serviceRole = createServiceRoleMock();
    serviceRole.setResult("account_members", "select", {
      data: { account_id: ACCOUNT_ID },
      error: null,
    });
    serviceRole.setResult("accounts", "update", { data: null, error: null });
    mocks.createServiceRoleClient.mockReturnValue(serviceRole);

    const redirectTo = `${ORIGIN}/auth/callback?next=${encodeURIComponent("/settings/billing?plan=team")}`;

    await expect(
      redirectUrl(signUp(signupForm({ plan: "team", niche: "agency" }))),
    ).resolves.toBe(
      `/login?message=${encodeURIComponent("Check your email to confirm your account.")}&next=${encodeURIComponent("/settings/billing?plan=team")}`,
    );

    expect(mocks.generateLink).toHaveBeenCalledWith({
      type: "signup",
      email: "owner@example.com",
      password: "password-1",
      options: {
        redirectTo,
        data: {
          app_name: "VesperwiseCRM",
          niche: "agency",
        },
      },
    });
    expect(serviceRole.selects).toEqual([
      {
        table: "account_members",
        eqs: [
          ["user_id", USER_ID],
          ["role", "owner"],
        ],
      },
    ]);
    expect(serviceRole.updates).toEqual([
      {
        table: "accounts",
        payload: {
          terms_accepted_at: NOW,
          age_confirmed_at: NOW,
        },
        eqs: [["id", ACCOUNT_ID]],
      },
    ]);
    expect(mocks.buildVerificationLink).toHaveBeenCalledWith(
      redirectTo,
      HASHED_TOKEN,
      "signup",
    );
    expect(mocks.sendSignupConfirmationEmail).toHaveBeenCalledWith({
      to: "owner@example.com",
      actionLink: `${redirectTo}#signup:${HASHED_TOKEN}`,
    });
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  test("prefixes https onto VERCEL_PROJECT_PRODUCTION_URL when SITE_URL is unset", async () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "prod.example.com";
    mocks.canSendBrandedAuthEmail.mockReturnValue(true);
    mocks.generateLink.mockResolvedValue({
      data: {
        properties: { hashed_token: HASHED_TOKEN },
        user: { id: USER_ID },
      },
      error: null,
    });
    const serviceRole = createServiceRoleMock();
    serviceRole.setResult("account_members", "select", {
      data: { account_id: ACCOUNT_ID },
      error: null,
    });
    serviceRole.setResult("accounts", "update", { data: null, error: null });
    mocks.createServiceRoleClient.mockReturnValue(serviceRole);

    await redirectUrl(signUp(signupForm({ niche: "broker" })));

    expect(mocks.generateLink).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          redirectTo: `https://prod.example.com/auth/callback?next=${encodeURIComponent("/pipeline")}`,
          data: {
            app_name: "VesperwiseCRM",
            niche: "wholesaler",
          },
        }),
      }),
    );
  });

  test("branded sendSignupConfirmationEmail rejection redirects the Error.message", async () => {
    mocks.canSendBrandedAuthEmail.mockReturnValue(true);
    mocks.generateLink.mockResolvedValue({
      data: {
        properties: { hashed_token: HASHED_TOKEN },
        user: { id: USER_ID },
      },
      error: null,
    });
    const serviceRole = createServiceRoleMock();
    serviceRole.setResult("account_members", "select", {
      data: { account_id: ACCOUNT_ID },
      error: null,
    });
    serviceRole.setResult("accounts", "update", { data: null, error: null });
    mocks.createServiceRoleClient.mockReturnValue(serviceRole);
    mocks.sendSignupConfirmationEmail.mockRejectedValue(
      new Error("SMTP exploded"),
    );

    await expect(redirectUrl(signUp(signupForm()))).resolves.toBe(
      `/signup?error=${encodeURIComponent("SMTP exploded")}`,
    );

    expect(mocks.generateLink).toHaveBeenCalled();
    expect(mocks.sendSignupConfirmationEmail).toHaveBeenCalled();

    await expect(
      redirectUrl(signUp(signupForm({ plan: "team" }))),
    ).resolves.toBe(
      `/signup?error=${encodeURIComponent("SMTP exploded")}&plan=team`,
    );
  });

  test("non-branded signUp error redirects without generateLink", async () => {
    mocks.canSendBrandedAuthEmail.mockReturnValue(false);
    mocks.signUp.mockResolvedValue({
      data: { user: null },
      error: { message: "weak password" },
    });

    await expect(redirectUrl(signUp(signupForm({ plan: "team" })))).resolves.toBe(
      `/signup?error=${encodeURIComponent("weak password")}&plan=team`,
    );

    expect(mocks.generateLink).not.toHaveBeenCalled();
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled();
  });

  test("non-branded missing user.id redirects Could not create the account", async () => {
    mocks.canSendBrandedAuthEmail.mockReturnValue(false);
    mocks.signUp.mockResolvedValue({
      data: { user: {} },
      error: null,
    });

    await expect(redirectUrl(signUp(signupForm()))).resolves.toBe(
      `/signup?error=${encodeURIComponent("Could not create the account")}`,
    );
  });

  test("non-branded success records attestations then redirects check-email", async () => {
    mocks.canSendBrandedAuthEmail.mockReturnValue(false);
    mocks.signUp.mockResolvedValue({
      data: { user: { id: USER_ID } },
      error: null,
    });
    const serviceRole = createServiceRoleMock();
    serviceRole.setResult("account_members", "select", {
      data: { account_id: ACCOUNT_ID },
      error: null,
    });
    serviceRole.setResult("accounts", "update", { data: null, error: null });
    mocks.createServiceRoleClient.mockReturnValue(serviceRole);

    await expect(redirectUrl(signUp(signupForm()))).resolves.toBe(
      `/login?message=${encodeURIComponent("Check your email to confirm your account.")}&next=${encodeURIComponent("/pipeline")}`,
    );

    expect(mocks.signUp).toHaveBeenCalledWith({
      email: "owner@example.com",
      password: "password-1",
      options: {
        emailRedirectTo: `${ORIGIN}/auth/callback?next=${encodeURIComponent("/pipeline")}`,
        data: { niche: "wholesaler" },
      },
    });
    expect(serviceRole.updates).toEqual([
      {
        table: "accounts",
        payload: {
          terms_accepted_at: NOW,
          age_confirmed_at: NOW,
        },
        eqs: [["id", ACCOUNT_ID]],
      },
    ]);
    expect(mocks.sendSignupConfirmationEmail).not.toHaveBeenCalled();
    expect(mocks.generateLink).not.toHaveBeenCalled();
  });
});

describe("signOutAction", () => {
  beforeEach(() => {
    mocks.redirect.mockClear();
    mocks.createClient.mockReset();
    mocks.signOut.mockReset();
    mocks.signOut.mockResolvedValue({ error: null });
    mocks.createClient.mockResolvedValue(createAuthClient());
  });

  test("signs out then redirects to /login", async () => {
    await expect(redirectUrl(signOutAction())).resolves.toBe("/login");
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
  });
});
