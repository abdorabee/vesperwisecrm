// Regression tests for the 2026-07-25 security audit fixes. Each block maps
// to a finding ID so a future reader can trace the test back to the reason
// it exists.
import { describe, expect, test } from "vitest";
import { escapeHtml, sanitizeEmailHeader } from "../src/lib/email/escape-html";
import { resolveSafeRedirect } from "../src/lib/auth/safe-redirect";
import { resolveInboundSmsTenant } from "../src/lib/sms/resolve-tenant";
import { redactToken } from "../src/lib/email/redact";

describe("H-3: email HTML escaping", () => {
  test("escapes the characters that break out of HTML context", () => {
    expect(escapeHtml(`<a href="x">&'`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&amp;&#39;",
    );
  });

  test("neutralizes an anchor injected through a tenant account name", () => {
    const accountName = '<a href="https://evil.example">Confirm billing</a>';
    const rendered = `You have been invited to join ${escapeHtml(accountName)}.`;

    expect(rendered).not.toContain("<a href");
    expect(rendered).toContain("&lt;a href=");
  });

  test("leaves ordinary account names readable", () => {
    expect(escapeHtml("Sunrise Property Group")).toBe("Sunrise Property Group");
  });

  test("strips CR/LF from header values so Subject cannot be split", () => {
    expect(sanitizeEmailHeader("Invite\r\nBcc: victim@example.com")).toBe(
      "Invite Bcc: victim@example.com",
    );
  });
});

describe("M-1: auth callback redirect validation", () => {
  const origin = "https://app.example.com";

  test("allows same-origin relative paths", () => {
    expect(resolveSafeRedirect("/leads/abc?tab=notes", origin)).toBe(
      "/leads/abc?tab=notes",
    );
  });

  // The vulnerability was string concatenation: `${origin}@evil.com` parses
  // with host evil.com, and `${origin}.evil.com` extends the hostname. Parsing
  // relative to origin neutralizes both -- they resolve to same-origin paths --
  // so the property under test is "the result never leaves origin", not any
  // particular fallback string.
  test.each([
    ["@evil.com", "/@evil.com"],
    [".evil.com", "/.evil.com"],
    ["//evil.com", "/pipeline"],
    ["https://evil.example/x", "/pipeline"],
    ["\\\\evil.com", "/pipeline"],
  ])("keeps %s on-origin", (next, expected) => {
    const result = resolveSafeRedirect(next, origin);

    expect(result).toBe(expected);
    expect(new URL(result, origin).origin).toBe(origin);
  });

  test("the old concatenation would have escaped the origin", () => {
    // Documents the bug this helper exists to prevent.
    expect(new URL(`${origin}@evil.com`).host).toBe("evil.com");
    expect(new URL(`${origin}${resolveSafeRedirect("@evil.com", origin)}`).host)
      .toBe("app.example.com");
  });

  test("falls back when next is absent or unparseable", () => {
    expect(resolveSafeRedirect(null, origin)).toBe("/pipeline");
    expect(resolveSafeRedirect("http://[", origin)).toBe("/pipeline");
  });
});

describe("H-2: inbound SMS tenant resolution", () => {
  const contactA = { id: "c1", account_id: "acct-a" };
  const contactB = { id: "c2", account_id: "acct-b" };

  test("uses the receiving number's account when the mapping is populated", () => {
    const result = resolveInboundSmsTenant({
      mappedAccountId: "acct-a",
      matchedContacts: [contactA, contactB],
    });

    expect(result).toEqual({
      status: "resolved",
      accountId: "acct-a",
      contactIds: ["c1"],
    });
  });

  test("quarantines when the mapped account has no matching contact", () => {
    const result = resolveInboundSmsTenant({
      mappedAccountId: "acct-c",
      matchedContacts: [contactA, contactB],
    });

    expect(result).toEqual({ status: "quarantined", reason: "unknown_sender" });
  });

  test("quarantines rather than guessing when a number spans two tenants", () => {
    const result = resolveInboundSmsTenant({
      mappedAccountId: null,
      matchedContacts: [contactA, contactB],
    });

    expect(result).toEqual({
      status: "quarantined",
      reason: "ambiguous_tenant",
    });
  });

  test("resolves unambiguously when only one tenant knows the number", () => {
    const result = resolveInboundSmsTenant({
      mappedAccountId: null,
      matchedContacts: [contactA, { id: "c3", account_id: "acct-a" }],
    });

    expect(result).toEqual({
      status: "resolved",
      accountId: "acct-a",
      contactIds: ["c1", "c3"],
    });
  });

  test("quarantines when nothing matched", () => {
    const result = resolveInboundSmsTenant({
      mappedAccountId: null,
      matchedContacts: [],
    });

    expect(result).toEqual({ status: "quarantined", reason: "unknown_sender" });
  });
});

describe("L-11: token redaction in logs", () => {
  test("keeps a correlatable prefix but drops the credential", () => {
    const redacted = redactToken("abcdef0123456789abcdef0123456789");

    expect(redacted).toBe("abcdef01…");
    expect(redacted).not.toContain("0123456789abcdef");
  });

  test("does not leak short values by echoing them whole", () => {
    expect(redactToken("abc")).toBe("…");
    expect(redactToken(null)).toBe("…");
  });
});
