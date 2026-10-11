import { readFileSync } from "node:fs";
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

const HOME = "home-tenant";
const INVITED = "invited-tenant";

function callback(params: Record<string, string>): Request {
  const url = new URL("https://www.vesperwisecrm.com/auth/callback");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new Request(url);
}

describe("auth callback invite redemption", () => {
  beforeEach(() => {
    mocks.exchangeCodeForSession.mockReset();
    mocks.verifyOtp.mockReset();
    mocks.redeemAcceptedInvite.mockReset();
    mocks.rememberActiveAccount.mockReset();
    mocks.getSessionMembership.mockReset();
    mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
    mocks.verifyOtp.mockResolvedValue({ error: null });
    mocks.redeemAcceptedInvite.mockResolvedValue(INVITED);
    mocks.getSessionMembership.mockResolvedValue({
      accountId: HOME,
      role: "owner",
      clientId: null,
      onboardingTourCompletedAt: null,
    });
    mocks.rememberActiveAccount.mockResolvedValue(undefined);
  });

  test("does not join or switch workspaces on an unrelated OAuth login", async () => {
    await GET(callback({ code: "oauth-code" }));

    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith("oauth-code");
    expect(mocks.redeemAcceptedInvite).not.toHaveBeenCalled();
    expect(mocks.rememberActiveAccount).toHaveBeenCalledTimes(1);
    expect(mocks.rememberActiveAccount).toHaveBeenCalledWith(HOME);
  });

  test.each(["signup", "magiclink", "recovery", "email_change", "email"])(
    "does not redeem a pending invite on a %s callback",
    async (type) => {
      await GET(callback({ token_hash: "otp-hash", type }));

      expect(mocks.verifyOtp).toHaveBeenCalledWith({
        type,
        token_hash: "otp-hash",
      });
      expect(mocks.redeemAcceptedInvite).not.toHaveBeenCalled();
      expect(mocks.rememberActiveAccount).toHaveBeenCalledTimes(1);
      expect(mocks.rememberActiveAccount).toHaveBeenCalledWith(HOME);
    },
  );

  test("does not treat an OAuth code labeled as an invite as acceptance", async () => {
    await GET(callback({ code: "oauth-code", type: "invite" }));

    expect(mocks.redeemAcceptedInvite).not.toHaveBeenCalled();
    expect(mocks.rememberActiveAccount).toHaveBeenCalledWith(HOME);
  });

  test("redeems and switches workspace only when the invite OTP is accepted", async () => {
    await GET(callback({ token_hash: "invite-hash", type: "invite" }));

    expect(mocks.verifyOtp).toHaveBeenCalledWith({
      type: "invite",
      token_hash: "invite-hash",
    });
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(mocks.redeemAcceptedInvite).toHaveBeenCalledTimes(1);
    expect(mocks.redeemAcceptedInvite).toHaveBeenCalledWith("invite-hash");
    expect(mocks.rememberActiveAccount).toHaveBeenCalledTimes(1);
    expect(mocks.rememberActiveAccount).toHaveBeenCalledWith(INVITED);
  });

  test("pins the workspace from the opened invite token, not a newer invite", async () => {
    mocks.redeemAcceptedInvite.mockImplementation(async (token: string) =>
      token === "older-token" ? "legit-tenant" : "attacker-tenant",
    );

    await GET(callback({ token_hash: "older-token", type: "invite" }));

    expect(mocks.redeemAcceptedInvite).toHaveBeenCalledWith("older-token");
    expect(mocks.rememberActiveAccount).toHaveBeenCalledTimes(1);
    expect(mocks.rememberActiveAccount).toHaveBeenCalledWith("legit-tenant");
  });
});

describe("supabase invite email", () => {
  test("sends the recipient to an invite OTP on our callback", () => {
    const template = readFileSync("supabase/templates/invite.html", "utf8");
    expect(template).toContain(
      "{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite",
    );
    expect(template).not.toContain("ConfirmationURL");
  });
});
