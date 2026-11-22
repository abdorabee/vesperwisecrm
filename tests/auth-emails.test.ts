import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  buildVerificationLink,
  canSendBrandedAuthEmail,
  getGeneratedTokenHash,
} from "@/lib/email/auth-emails";

const originalApiKey = process.env.RESEND_API_KEY;
const originalFrom = process.env.RESEND_FROM_EMAIL;

describe("canSendBrandedAuthEmail", () => {
  beforeEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
  });

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env.RESEND_API_KEY;
    } else {
      process.env.RESEND_API_KEY = originalApiKey;
    }
    if (originalFrom === undefined) {
      delete process.env.RESEND_FROM_EMAIL;
    } else {
      process.env.RESEND_FROM_EMAIL = originalFrom;
    }
  });

  test("is true only when both RESEND_API_KEY and RESEND_FROM_EMAIL are set", () => {
    expect(canSendBrandedAuthEmail()).toBe(false);

    process.env.RESEND_API_KEY = "re_test";
    expect(canSendBrandedAuthEmail()).toBe(false);

    delete process.env.RESEND_API_KEY;
    process.env.RESEND_FROM_EMAIL = "hello@vesperwise.test";
    expect(canSendBrandedAuthEmail()).toBe(false);

    process.env.RESEND_API_KEY = "re_test";
    process.env.RESEND_FROM_EMAIL = "hello@vesperwise.test";
    expect(canSendBrandedAuthEmail()).toBe(true);
  });
});

describe("buildVerificationLink", () => {
  test("sets token_hash and type on a signup callback and preserves existing query", () => {
    const link = buildVerificationLink(
      "https://app.example.com/auth/callback?next=%2Fpipeline",
      "hash-signup",
      "signup",
    );
    const url = new URL(link);

    expect(url.origin).toBe("https://app.example.com");
    expect(url.pathname).toBe("/auth/callback");
    expect(url.searchParams.get("next")).toBe("/pipeline");
    expect(url.searchParams.get("token_hash")).toBe("hash-signup");
    expect(url.searchParams.get("type")).toBe("signup");
  });

  test("sets type=invite without dropping other query params", () => {
    const link = buildVerificationLink(
      "https://app.example.com/auth/callback?next=%2Fteam",
      "hash-invite",
      "invite",
    );
    const url = new URL(link);

    expect(url.searchParams.get("next")).toBe("/team");
    expect(url.searchParams.get("token_hash")).toBe("hash-invite");
    expect(url.searchParams.get("type")).toBe("invite");
  });
});

describe("getGeneratedTokenHash", () => {
  test("returns null for non-objects, missing properties, and non-string hashed_token", () => {
    expect(getGeneratedTokenHash(null)).toBeNull();
    expect(getGeneratedTokenHash(undefined)).toBeNull();
    expect(getGeneratedTokenHash("hashed")).toBeNull();
    expect(getGeneratedTokenHash(1)).toBeNull();
    expect(getGeneratedTokenHash([])).toBeNull();
    expect(getGeneratedTokenHash({})).toBeNull();
    expect(getGeneratedTokenHash({ properties: {} })).toBeNull();
    expect(getGeneratedTokenHash({ properties: { hashed_token: 12 } })).toBeNull();
  });

  test("returns the hashed_token string when present", () => {
    expect(
      getGeneratedTokenHash({ properties: { hashed_token: "abc" } }),
    ).toBe("abc");
  });
});
