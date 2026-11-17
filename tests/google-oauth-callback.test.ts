import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookieGet: vi.fn(),
  cookieDelete: vi.fn(),
  cookieSet: vi.fn(),
  requireAdminAccountId: vi.fn(),
  requireUserId: vi.fn(),
  exchangeGoogleCode: vi.fn(),
  isGoogleConfigured: vi.fn(),
  getGoogleAuthUrl: vi.fn(),
  encryptGoogleToken: vi.fn((value: string) => `enc:${value}`),
  upsert: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: mocks.cookieGet,
    delete: mocks.cookieDelete,
    set: mocks.cookieSet,
  }),
}));

vi.mock("@/lib/supabase/account", () => ({
  requireAdminAccountId: mocks.requireAdminAccountId,
  requireUserId: mocks.requireUserId,
}));

vi.mock("@/lib/google/client", () => ({
  exchangeGoogleCode: mocks.exchangeGoogleCode,
  isGoogleConfigured: mocks.isGoogleConfigured,
  getGoogleAuthUrl: mocks.getGoogleAuthUrl,
}));

vi.mock("@/lib/google/token-crypto", () => ({
  encryptGoogleToken: mocks.encryptGoogleToken,
}));

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({
    from(table: string) {
      return {
        upsert(payload: unknown, options: unknown) {
          return mocks.upsert(table, payload, options);
        },
      };
    },
  }),
}));

import { GET as authorizeGET } from "@/app/api/google/authorize/route";
import { GET as callbackGET } from "@/app/api/google/callback/route";
import { GOOGLE_OAUTH_STATE_COOKIE } from "@/lib/google/oauth-state";

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "user-1";
const ORIGIN = "https://www.vesperwisecrm.com";
const EXPIRES_AT = new Date("2026-12-01T00:00:00.000Z");

function callbackRequest(params: Record<string, string> = {}): Request {
  const url = new URL("/api/google/callback", ORIGIN);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new Request(url);
}

function settingsLocation(params: Record<string, string>): string {
  const url = new URL("/settings/google", ORIGIN);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

describe("Google OAuth callback", () => {
  beforeEach(() => {
    mocks.cookieGet.mockReset();
    mocks.cookieDelete.mockReset();
    mocks.cookieSet.mockReset();
    mocks.requireAdminAccountId.mockReset();
    mocks.requireUserId.mockReset();
    mocks.exchangeGoogleCode.mockReset();
    mocks.isGoogleConfigured.mockReset();
    mocks.getGoogleAuthUrl.mockReset();
    mocks.encryptGoogleToken.mockReset();
    mocks.upsert.mockReset();
    mocks.isGoogleConfigured.mockReturnValue(true);
    mocks.requireAdminAccountId.mockResolvedValue(ACCOUNT_ID);
    mocks.requireUserId.mockResolvedValue(USER_ID);
    mocks.encryptGoogleToken.mockImplementation((value: string) => `enc:${value}`);
    mocks.exchangeGoogleCode.mockResolvedValue({
      accessToken: "access-plain",
      refreshToken: "refresh-plain",
      expiresAt: EXPIRES_AT,
      email: "owner@example.com",
    });
    mocks.upsert.mockResolvedValue({ error: null });
  });

  test("redirects access_denied without exchanging or upserting", async () => {
    const response = await callbackGET(
      callbackRequest({ error: "access_denied" }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      settingsLocation({ error: "access_denied" }),
    );
    expect(mocks.exchangeGoogleCode).not.toHaveBeenCalled();
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(mocks.cookieDelete).not.toHaveBeenCalled();
  });

  test("redirects invalid_request when Google is configured but code is missing", async () => {
    const response = await callbackGET(callbackRequest({ state: "nonce-1" }));

    expect(response.headers.get("location")).toBe(
      settingsLocation({ error: "invalid_request" }),
    );
    expect(mocks.exchangeGoogleCode).not.toHaveBeenCalled();
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  test("redirects invalid_request when Google is configured but state is missing", async () => {
    const response = await callbackGET(callbackRequest({ code: "oauth-code" }));

    expect(response.headers.get("location")).toBe(
      settingsLocation({ error: "invalid_request" }),
    );
    expect(mocks.exchangeGoogleCode).not.toHaveBeenCalled();
  });

  test("redirects invalid_request when Google is not configured", async () => {
    mocks.isGoogleConfigured.mockReturnValue(false);

    const response = await callbackGET(
      callbackRequest({ code: "oauth-code", state: "nonce-1" }),
    );

    expect(response.headers.get("location")).toBe(
      settingsLocation({ error: "invalid_request" }),
    );
    expect(mocks.exchangeGoogleCode).not.toHaveBeenCalled();
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  test("redirects state_mismatch and deletes the cookie when it is missing", async () => {
    mocks.cookieGet.mockReturnValue(undefined);

    const response = await callbackGET(
      callbackRequest({ code: "oauth-code", state: "nonce-1" }),
    );

    expect(response.headers.get("location")).toBe(
      settingsLocation({ error: "state_mismatch" }),
    );
    expect(mocks.cookieGet).toHaveBeenCalledWith(GOOGLE_OAUTH_STATE_COOKIE);
    expect(mocks.cookieDelete).toHaveBeenCalledWith(GOOGLE_OAUTH_STATE_COOKIE);
    expect(mocks.exchangeGoogleCode).not.toHaveBeenCalled();
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  test("redirects state_mismatch and deletes the cookie when it does not match", async () => {
    mocks.cookieGet.mockReturnValue({ value: "other-nonce" });

    const response = await callbackGET(
      callbackRequest({ code: "oauth-code", state: "nonce-1" }),
    );

    expect(response.headers.get("location")).toBe(
      settingsLocation({ error: "state_mismatch" }),
    );
    expect(mocks.cookieDelete).toHaveBeenCalledWith(GOOGLE_OAUTH_STATE_COOKIE);
    expect(mocks.exchangeGoogleCode).not.toHaveBeenCalled();
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  test("exchanges the code and upserts encrypted tokens when state matches", async () => {
    mocks.cookieGet.mockReturnValue({ value: "nonce-1" });

    const response = await callbackGET(
      callbackRequest({ code: "oauth-code", state: "nonce-1" }),
    );

    expect(mocks.cookieDelete).toHaveBeenCalledWith(GOOGLE_OAUTH_STATE_COOKIE);
    expect(mocks.requireAdminAccountId).toHaveBeenCalledTimes(1);
    expect(mocks.requireUserId).toHaveBeenCalledTimes(1);
    expect(mocks.exchangeGoogleCode).toHaveBeenCalledWith("oauth-code");
    expect(mocks.encryptGoogleToken).toHaveBeenCalledWith("access-plain");
    expect(mocks.encryptGoogleToken).toHaveBeenCalledWith("refresh-plain");
    expect(mocks.upsert).toHaveBeenCalledTimes(1);
    expect(mocks.upsert).toHaveBeenCalledWith(
      "google_integrations",
      expect.objectContaining({
        account_id: ACCOUNT_ID,
        access_token: "enc:access-plain",
        refresh_token: "enc:refresh-plain",
        token_expires_at: EXPIRES_AT.toISOString(),
        connected_email: "owner@example.com",
        connected_by_user_id: USER_ID,
      }),
      { onConflict: "account_id" },
    );
    const payload = mocks.upsert.mock.calls[0]?.[1] as {
      connected_at: string;
      updated_at: string;
    };
    expect(new Date(payload.connected_at).toISOString()).toBe(payload.connected_at);
    expect(new Date(payload.updated_at).toISOString()).toBe(payload.updated_at);
    expect(response.headers.get("location")).toBe(
      settingsLocation({ connected: "1" }),
    );
  });

  test("redirects with the exchange error and does not upsert", async () => {
    mocks.cookieGet.mockReturnValue({ value: "nonce-1" });
    mocks.exchangeGoogleCode.mockRejectedValue(
      new Error("Google didn't return offline access"),
    );

    const response = await callbackGET(
      callbackRequest({ code: "oauth-code", state: "nonce-1" }),
    );

    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      settingsLocation({ error: "Google didn't return offline access" }),
    );
  });
});

describe("Google OAuth authorize", () => {
  beforeEach(() => {
    mocks.cookieGet.mockReset();
    mocks.cookieDelete.mockReset();
    mocks.cookieSet.mockReset();
    mocks.requireAdminAccountId.mockReset();
    mocks.requireUserId.mockReset();
    mocks.exchangeGoogleCode.mockReset();
    mocks.isGoogleConfigured.mockReset();
    mocks.getGoogleAuthUrl.mockReset();
    mocks.encryptGoogleToken.mockReset();
    mocks.upsert.mockReset();
    mocks.requireAdminAccountId.mockResolvedValue(ACCOUNT_ID);
    mocks.getGoogleAuthUrl.mockImplementation(
      (state: string) => `https://accounts.google.com/o/oauth2/v2/auth?state=${state}`,
    );
  });

  test("returns 501 JSON when Google is not configured", async () => {
    mocks.isGoogleConfigured.mockReturnValue(false);

    const response = await authorizeGET();

    expect(response.status).toBe(501);
    await expect(response.json()).resolves.toEqual({
      error: "Google integration isn't configured yet",
    });
    expect(mocks.requireAdminAccountId).not.toHaveBeenCalled();
    expect(mocks.cookieSet).not.toHaveBeenCalled();
  });

  test("sets the oauth state cookie and redirects an admin to Google", async () => {
    mocks.isGoogleConfigured.mockReturnValue(true);

    const response = await authorizeGET();

    expect(mocks.requireAdminAccountId).toHaveBeenCalledTimes(1);
    expect(mocks.cookieSet).toHaveBeenCalledTimes(1);
    const [cookieName, nonce, options] = mocks.cookieSet.mock.calls[0] as [
      string,
      string,
      { httpOnly: boolean; sameSite: string; path: string; maxAge: number },
    ];
    expect(cookieName).toBe(GOOGLE_OAUTH_STATE_COOKIE);
    expect(nonce).toEqual(expect.any(String));
    expect(nonce.length).toBeGreaterThan(0);
    expect(options).toEqual(
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 600,
      }),
    );
    expect(mocks.getGoogleAuthUrl).toHaveBeenCalledWith(nonce);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `https://accounts.google.com/o/oauth2/v2/auth?state=${nonce}`,
    );
  });
});
