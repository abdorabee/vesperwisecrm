import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

const rpc = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({ rpc }),
}));

import { sanitizeHtml, stripHtmlTags } from "@/lib/email/sanitize-html";
import {
  hashIntakeToken,
  isWellFormedIntakeToken,
  mintIntakeToken,
} from "@/lib/leads/intake-token";
import { consumeRateLimit, platformClientIp } from "@/lib/rate-limit";

const migration = readFileSync(
  "supabase/migrations/20261011072511_security_findings.sql",
  "utf8",
);

describe("stored email HTML", () => {
  test("keeps a small email allowlist and forces link rel", () => {
    const clean = sanitizeHtml(
      `<style>body{display:none}</style><form><input></form><img src="https://evil.test/x.png"><script>alert(1)</script><p>Hello <strong>there</strong></p><a href="https://example.com" onclick="alert(1)">link</a>`,
    );

    expect(clean).toContain("<p>");
    expect(clean).toContain("<strong>there</strong>");
    expect(clean).toContain('rel="noopener noreferrer"');
    expect(clean).not.toContain("<style");
    expect(clean).not.toContain("<form");
    expect(clean).not.toContain("<img");
    expect(clean).not.toContain("<script");
    expect(clean).not.toContain("onclick");
  });

  test("strips tags for the plain-text path", () => {
    expect(stripHtmlTags("<p>Hello <em>there</em></p>")).toBe("Hello there");
  });

  test("the activity feed does not inject stored HTML into the page", () => {
    const source = readFileSync(
      "src/app/(dashboard)/leads/[leadId]/_components/activity-feed.tsx",
      "utf8",
    );
    expect(source).not.toContain("dangerouslySetInnerHTML");
    expect(source).toContain('sandbox=""');
    expect(source).toContain("sanitizeHtml");
  });
});

describe("google token encryption", () => {
  test("round-trips with the dialer server key and leaves a legacy value readable", async () => {
    process.env.DIALER_CREDENTIALS_ENCRYPTION_KEY = randomBytes(32).toString("base64");
    const { decryptGoogleToken, encryptGoogleToken, isEncryptedGoogleToken } =
      await import("@/lib/google/token-crypto");
    const ciphertext = encryptGoogleToken("refresh-token");

    expect(isEncryptedGoogleToken(ciphertext)).toBe(true);
    expect(ciphertext).not.toContain("refresh-token");
    expect(decryptGoogleToken(ciphertext)).toBe("refresh-token");
    expect(decryptGoogleToken("legacy-plain")).toBe("legacy-plain");
  });
});

describe("lead intake tokens", () => {
  test("mints 32 bytes and stores a hash shape", () => {
    const token = mintIntakeToken();
    expect(isWellFormedIntakeToken(token)).toBe(true);
    expect(hashIntakeToken(token)).toMatch(/^[0-9a-f]{64}$/);
  });

  test("rejects short tokens", () => {
    expect(isWellFormedIntakeToken("short")).toBe(false);
    expect(isWellFormedIntakeToken("a".repeat(16))).toBe(false);
  });
});

describe("platform rate limits", () => {
  test("uses the platform client IP, not the caller-supplied forwarded list", () => {
    const headers = new Headers({
      "x-forwarded-for": "1.1.1.1, 2.2.2.2",
      "x-vercel-forwarded-for": "203.0.113.9",
      "x-real-ip": "198.51.100.4",
    });
    expect(platformClientIp(headers)).toBe("203.0.113.9");
  });

  test("fails closed when the limiter errors and the caller asks it to", async () => {
    rpc.mockRejectedValueOnce(new Error("db down"));
    await expect(
      consumeRateLimit({
        scope: "signup",
        identifier: "203.0.113.9",
        limit: 10,
        windowSeconds: 3600,
        failClosed: true,
      }),
    ).resolves.toBe(false);

    rpc.mockResolvedValueOnce({ data: null, error: { message: "rpc failed" } });
    await expect(
      consumeRateLimit({
        scope: "signup",
        identifier: "203.0.113.9",
        limit: 10,
        windowSeconds: 3600,
        failClosed: true,
      }),
    ).resolves.toBe(false);
  });
});

describe("security migration contract", () => {
  test("binds enrollment, round robin, intake hashes, comments, and SMS sid", () => {
    expect(migration).toContain("enforce_enrollment_same_account");
    expect(migration).toContain("public.can_access_lead(p_lead_id)");
    expect(migration).toContain("token_hash");
    expect(migration).toContain("lead_intake_sources_token_hash_format");
    expect(migration).toContain("l.client_id = public.get_my_client_id");
    expect(migration).toContain("activities_inbound_sms_message_sid_uidx");
    expect(migration).toContain("revoke select, insert, update, delete on table public.google_integrations");
    expect(migration).not.toContain("on conflict (account_id, user_id) do update");
  });

  test("reply activities do not store the bearer token", () => {
    const source = readFileSync("src/lib/email/send-lead-email.ts", "utf8");
    expect(source).not.toContain("outbound_token");
  });

  test("inquiry mail has no personal inbox fallback", () => {
    const source = readFileSync("src/lib/email/marketing-inquiry.ts", "utf8");
    expect(source).toContain("DEMO_INBOX_EMAIL is not configured");
    expect(source).not.toContain("DEFAULT_INQUIRY_INBOX");
  });
});
