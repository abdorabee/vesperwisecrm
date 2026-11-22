import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  verifyOtp: vi.fn(),
  redeemAcceptedInvite: vi.fn(),
  rememberActiveAccount: vi.fn(),
  getSessionMembership: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      exchangeCodeForSession: mocks.exchangeCodeForSession,
      verifyOtp: mocks.verifyOtp,
    },
  }),
}));

vi.mock("@/lib/auth/redeem-invite", () => ({
  redeemAcceptedInvite: mocks.redeemAcceptedInvite,
}));

vi.mock("@/lib/supabase/account", () => ({
  rememberActiveAccount: mocks.rememberActiveAccount,
  getSessionMembership: mocks.getSessionMembership,
}));

import { GET } from "@/app/auth/callback/route";

const ORIGIN = "https://www.vesperwisecrm.com";
const HOME = "home-tenant";

function callback(params: Record<string, string>): Request {
  const url = new URL(`${ORIGIN}/auth/callback`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new Request(url);
}

function locationOf(response: Response): URL {
  return new URL(response.headers.get("location") ?? "", ORIGIN);
}

describe("auth callback redirect edges", () => {
  beforeEach(() => {
    mocks.exchangeCodeForSession.mockReset();
    mocks.verifyOtp.mockReset();
    mocks.redeemAcceptedInvite.mockReset();
    mocks.rememberActiveAccount.mockReset();
    mocks.getSessionMembership.mockReset();
    mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
    mocks.verifyOtp.mockResolvedValue({ error: null });
    mocks.redeemAcceptedInvite.mockResolvedValue(null);
    mocks.getSessionMembership.mockResolvedValue({
      accountId: HOME,
      role: "owner",
      clientId: null,
      onboardingTourCompletedAt: null,
    });
    mocks.rememberActiveAccount.mockResolvedValue(undefined);
  });

  test("unknown otp type with token_hash does not verify or exchange and redirects login error", async () => {
    const response = await GET(
      callback({ token_hash: "otp-hash", type: "not-an-otp" }),
    );

    expect(mocks.verifyOtp).not.toHaveBeenCalled();
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(mocks.rememberActiveAccount).not.toHaveBeenCalled();
    expect(response.status).toBe(307);
    expect(locationOf(response).origin).toBe(ORIGIN);
    expect(`${locationOf(response).pathname}${locationOf(response).search}`).toBe(
      `/login?error=${encodeURIComponent("Could not authenticate")}`,
    );
  });

  test("successful code exchange with an off-origin next stays on the request origin at /pipeline", async () => {
    const response = await GET(
      callback({ code: "oauth-code", next: "https://evil.example/phish" }),
    );

    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith("oauth-code");
    expect(locationOf(response).origin).toBe(ORIGIN);
    expect(locationOf(response).pathname).toBe("/pipeline");
  });

  test("successful code exchange with next=/leads/abc redirects that path on the request origin", async () => {
    const response = await GET(
      callback({ code: "oauth-code", next: "/leads/abc" }),
    );

    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith("oauth-code");
    expect(locationOf(response).origin).toBe(ORIGIN);
    expect(locationOf(response).pathname).toBe("/leads/abc");
  });

  test("exchangeCodeForSession error redirects login error and does not remember the account", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({
      error: { message: "bad code" },
    });

    const response = await GET(callback({ code: "oauth-code" }));

    expect(mocks.rememberActiveAccount).not.toHaveBeenCalled();
    expect(mocks.getSessionMembership).not.toHaveBeenCalled();
    expect(locationOf(response).origin).toBe(ORIGIN);
    expect(`${locationOf(response).pathname}${locationOf(response).search}`).toBe(
      `/login?error=${encodeURIComponent("Could not authenticate")}`,
    );
  });

  test("missing code and token_hash redirects login error without verify or exchange", async () => {
    const response = await GET(callback({ next: "/leads/abc" }));

    expect(mocks.verifyOtp).not.toHaveBeenCalled();
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(mocks.rememberActiveAccount).not.toHaveBeenCalled();
    expect(`${locationOf(response).pathname}${locationOf(response).search}`).toBe(
      `/login?error=${encodeURIComponent("Could not authenticate")}`,
    );
  });
});
