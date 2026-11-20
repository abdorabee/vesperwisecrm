import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requireAdminAccountId: vi.fn(),
  requireWritableBilling: vi.fn(),
  getAccountEmailSettings: vi.fn(),
  upsertAccountEmailSettings: vi.fn(),
  createSendingDomain: vi.fn(),
  verifySendingDomain: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/supabase/account", () => ({
  requireAdminAccountId: mocks.requireAdminAccountId,
}));

vi.mock("@/lib/billing/access", () => ({
  requireWritableBilling: mocks.requireWritableBilling,
}));

vi.mock("@/lib/email/account-settings", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/email/account-settings")>();
  return {
    ...actual,
    getAccountEmailSettings: mocks.getAccountEmailSettings,
    upsertAccountEmailSettings: mocks.upsertAccountEmailSettings,
  };
});

vi.mock("@/lib/email/resend-domains", () => ({
  createSendingDomain: mocks.createSendingDomain,
  verifySendingDomain: mocks.verifySendingDomain,
}));

import {
  refreshDomainVerification,
  registerSendingDomain,
  updateEmailIdentity,
} from "@/lib/actions/account-email";
import {
  assertAccountEmailReady,
  isAccountEmailReady,
  mapResendDomainStatus,
  type AccountEmailSettings,
} from "@/lib/email/account-settings";
import { formatFromAddress } from "@/lib/email/sender-identity";
import {
  registerSendingDomainSchema,
  updateEmailIdentitySchema,
} from "@/lib/validations/account-email";

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";

function settings(
  overrides: Partial<AccountEmailSettings> = {},
): AccountEmailSettings {
  return {
    account_id: ACCOUNT_ID,
    sending_domain: "mail.example.com",
    from_email: "hello@mail.example.com",
    from_name: "Vesper",
    domain_verification_status: "verified",
    outbound_suspended: false,
    resend_domain_id: "resend-dom-1",
    capture_replies_enabled: false,
    default_reply_to_email: null,
    last_test_sent_at: null,
    reply_routing_mode: "none",
    suspended_at: null,
    suspended_reason: null,
    updated_at: "2026-11-20T00:00:00.000Z",
    ...overrides,
  } as AccountEmailSettings;
}

describe("registerSendingDomainSchema", () => {
  test("trims, lowercases, and strips protocol plus path", () => {
    expect(
      registerSendingDomainSchema.parse({
        domain: "  https://Mail.Example.com/foo  ",
      }),
    ).toEqual({ domain: "mail.example.com" });
  });

  test("rejects an empty domain", () => {
    const result = registerSendingDomainSchema.safeParse({ domain: "   " });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toContain(
        "Domain is required",
      );
    }
  });

  test("rejects an invalid domain", () => {
    const result = registerSendingDomainSchema.safeParse({
      domain: "not a domain",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toContain(
        "Enter a valid domain (e.g. example.com)",
      );
    }
  });
});

describe("updateEmailIdentitySchema", () => {
  test("requires a from name after trim", () => {
    const result = updateEmailIdentitySchema.safeParse({
      fromName: "   ",
      fromEmail: "hello@mail.example.com",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toContain(
        "From name is required",
      );
    }
  });

  test("requires a valid from email", () => {
    const result = updateEmailIdentitySchema.safeParse({
      fromName: "Vesper",
      fromEmail: "not-an-email",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toContain(
        "Enter a valid email address",
      );
    }
  });
});

describe("mapResendDomainStatus", () => {
  test("maps verified, failed, and everything else", () => {
    expect(mapResendDomainStatus("verified")).toBe("verified");
    expect(mapResendDomainStatus("failed")).toBe("failed");
    expect(mapResendDomainStatus("partially_failed")).toBe("failed");
    expect(mapResendDomainStatus("pending")).toBe("pending");
    expect(mapResendDomainStatus("not_started")).toBe("pending");
  });
});

describe("isAccountEmailReady", () => {
  test("is false when the sending domain is missing", () => {
    expect(isAccountEmailReady(settings({ sending_domain: null }))).toBe(false);
    expect(isAccountEmailReady(null)).toBe(false);
  });

  test("is false when from_email is missing", () => {
    expect(isAccountEmailReady(settings({ from_email: null }))).toBe(false);
    expect(isAccountEmailReady(settings({ from_email: "   " }))).toBe(false);
  });

  test("is false when the domain is not verified", () => {
    expect(
      isAccountEmailReady(settings({ domain_verification_status: "pending" })),
    ).toBe(false);
    expect(
      isAccountEmailReady(settings({ domain_verification_status: "failed" })),
    ).toBe(false);
  });

  test("is false when from_email does not match the sending domain", () => {
    expect(
      isAccountEmailReady(settings({ from_email: "hello@other.com" })),
    ).toBe(false);
  });

  test("is true when verified and the from_email domain matches case-insensitively", () => {
    expect(
      isAccountEmailReady(
        settings({
          sending_domain: "Mail.Example.com",
          from_email: "hello@MAIL.example.com",
          domain_verification_status: "verified",
        }),
      ),
    ).toBe(true);
  });
});

describe("assertAccountEmailReady", () => {
  test("throws the contact-support message first when outbound is suspended", () => {
    expect(() =>
      assertAccountEmailReady(settings({ outbound_suspended: true })),
    ).toThrow(
      "Outbound email is suspended for this account. Contact support if you believe this is an error.",
    );
  });

  test("throws the pending DNS message", () => {
    expect(() =>
      assertAccountEmailReady(
        settings({ domain_verification_status: "pending" }),
      ),
    ).toThrow(
      "Your sending domain is still pending DNS verification. Finish setup in Settings → Email.",
    );
  });

  test("throws the failed DNS message", () => {
    expect(() =>
      assertAccountEmailReady(
        settings({ domain_verification_status: "failed" }),
      ),
    ).toThrow(
      "Domain verification failed. Check DNS records in Settings → Email.",
    );
  });

  test("throws when from name or email is missing", () => {
    expect(() =>
      assertAccountEmailReady(settings({ from_email: null })),
    ).toThrow("Set a From name and email in Settings → Email.");
    expect(() =>
      assertAccountEmailReady(settings({ from_name: "  " })),
    ).toThrow("Set a From name and email in Settings → Email.");
  });

  test("throws a domain mismatch message that includes the sending domain", () => {
    expect(() =>
      assertAccountEmailReady(
        settings({ from_email: "hello@other.com", sending_domain: "mail.example.com" }),
      ),
    ).toThrow("From email must use your verified domain (@mail.example.com).");
  });
});

describe("formatFromAddress", () => {
  test("formats Name <email> when a from name is set", () => {
    expect(formatFromAddress(settings())).toBe(
      "Vesper <hello@mail.example.com>",
    );
  });

  test("returns the bare email when from name is empty", () => {
    expect(formatFromAddress(settings({ from_name: "  " }))).toBe(
      "hello@mail.example.com",
    );
  });

  test("throws when from_email is empty", () => {
    expect(() => formatFromAddress(settings({ from_email: null }))).toThrow(
      "From email is required",
    );
    expect(() => formatFromAddress(settings({ from_email: "  " }))).toThrow(
      "From email is required",
    );
  });
});

describe("registerSendingDomain", () => {
  beforeEach(() => {
    mocks.revalidatePath.mockReset();
    mocks.requireAdminAccountId.mockReset();
    mocks.requireWritableBilling.mockReset();
    mocks.getAccountEmailSettings.mockReset();
    mocks.upsertAccountEmailSettings.mockReset();
    mocks.createSendingDomain.mockReset();
    mocks.verifySendingDomain.mockReset();
    mocks.requireAdminAccountId.mockResolvedValue(ACCOUNT_ID);
    mocks.requireWritableBilling.mockResolvedValue(undefined);
    mocks.upsertAccountEmailSettings.mockResolvedValue(settings());
    mocks.createSendingDomain.mockResolvedValue({
      id: "resend-dom-new",
      name: "mail.example.com",
      status: "pending",
      records: [],
    });
  });

  test("returns without creating or upserting when the domain is already registered", async () => {
    mocks.getAccountEmailSettings.mockResolvedValue(
      settings({
        sending_domain: "mail.example.com",
        resend_domain_id: "resend-dom-1",
      }),
    );

    await registerSendingDomain({ domain: "https://Mail.Example.com/foo" });

    expect(mocks.requireAdminAccountId).toHaveBeenCalled();
    expect(mocks.requireWritableBilling).toHaveBeenCalledWith(ACCOUNT_ID);
    expect(mocks.createSendingDomain).not.toHaveBeenCalled();
    expect(mocks.upsertAccountEmailSettings).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  test("creates the domain and nulls from_email when the sending domain changes", async () => {
    mocks.getAccountEmailSettings.mockResolvedValue(
      settings({
        sending_domain: "old.example.com",
        from_email: "hi@old.example.com",
        from_name: "Old Name",
        resend_domain_id: "resend-old",
      }),
    );

    await registerSendingDomain({ domain: "mail.example.com" });

    expect(mocks.createSendingDomain).toHaveBeenCalledWith("mail.example.com");
    expect(mocks.upsertAccountEmailSettings).toHaveBeenCalledWith(ACCOUNT_ID, {
      sending_domain: "mail.example.com",
      resend_domain_id: "resend-dom-new",
      domain_verification_status: "pending",
      from_email: null,
      from_name: "Old Name",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/settings/email");
  });

  test("keeps from_email when re-registering the same domain without a resend id", async () => {
    mocks.getAccountEmailSettings.mockResolvedValue(
      settings({
        sending_domain: "mail.example.com",
        from_email: "keep@mail.example.com",
        from_name: "Keep",
        resend_domain_id: null,
      }),
    );

    await registerSendingDomain({ domain: "mail.example.com" });

    expect(mocks.createSendingDomain).toHaveBeenCalledWith("mail.example.com");
    expect(mocks.upsertAccountEmailSettings).toHaveBeenCalledWith(ACCOUNT_ID, {
      sending_domain: "mail.example.com",
      resend_domain_id: "resend-dom-new",
      domain_verification_status: "pending",
      from_email: "keep@mail.example.com",
      from_name: "Keep",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/settings/email");
  });
});

describe("updateEmailIdentity", () => {
  beforeEach(() => {
    mocks.revalidatePath.mockReset();
    mocks.requireAdminAccountId.mockReset();
    mocks.requireWritableBilling.mockReset();
    mocks.getAccountEmailSettings.mockReset();
    mocks.upsertAccountEmailSettings.mockReset();
    mocks.requireAdminAccountId.mockResolvedValue(ACCOUNT_ID);
    mocks.requireWritableBilling.mockResolvedValue(undefined);
    mocks.upsertAccountEmailSettings.mockResolvedValue(settings());
  });

  test("throws when no sending domain is registered", async () => {
    mocks.getAccountEmailSettings.mockResolvedValue(
      settings({ sending_domain: null }),
    );

    await expect(
      updateEmailIdentity({
        fromName: "Vesper",
        fromEmail: "hello@mail.example.com",
      }),
    ).rejects.toThrow("Register a sending domain before setting a From address");

    expect(mocks.upsertAccountEmailSettings).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  test("throws when from_email is not on the sending domain", async () => {
    mocks.getAccountEmailSettings.mockResolvedValue(
      settings({ sending_domain: "mail.example.com" }),
    );

    await expect(
      updateEmailIdentity({
        fromName: "Vesper",
        fromEmail: "hello@other.com",
      }),
    ).rejects.toThrow(
      "From email must use your sending domain (@mail.example.com)",
    );

    expect(mocks.upsertAccountEmailSettings).not.toHaveBeenCalled();
  });

  test("matches the sending domain case-insensitively, lowercases email, and trims name", async () => {
    mocks.getAccountEmailSettings.mockResolvedValue(
      settings({ sending_domain: "Mail.Example.com" }),
    );

    await updateEmailIdentity({
      fromName: "  Vesper Team  ",
      fromEmail: "Hello@MAIL.example.com",
    });

    expect(mocks.upsertAccountEmailSettings).toHaveBeenCalledWith(ACCOUNT_ID, {
      from_name: "Vesper Team",
      from_email: "hello@mail.example.com",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/settings/email");
  });
});

describe("refreshDomainVerification", () => {
  beforeEach(() => {
    mocks.revalidatePath.mockReset();
    mocks.requireAdminAccountId.mockReset();
    mocks.requireWritableBilling.mockReset();
    mocks.getAccountEmailSettings.mockReset();
    mocks.upsertAccountEmailSettings.mockReset();
    mocks.verifySendingDomain.mockReset();
    mocks.requireAdminAccountId.mockResolvedValue(ACCOUNT_ID);
    mocks.requireWritableBilling.mockResolvedValue(undefined);
    mocks.upsertAccountEmailSettings.mockResolvedValue(settings());
  });

  test("throws when no resend domain is registered", async () => {
    mocks.getAccountEmailSettings.mockResolvedValue(
      settings({ resend_domain_id: null }),
    );

    await expect(refreshDomainVerification()).rejects.toThrow(
      "No sending domain is registered yet",
    );

    expect(mocks.verifySendingDomain).not.toHaveBeenCalled();
    expect(mocks.upsertAccountEmailSettings).not.toHaveBeenCalled();
  });

  test("verifies the domain then upserts the mapped status", async () => {
    mocks.getAccountEmailSettings.mockResolvedValue(
      settings({ resend_domain_id: "resend-dom-1" }),
    );
    mocks.verifySendingDomain.mockResolvedValue({
      id: "resend-dom-1",
      name: "mail.example.com",
      status: "verified",
      records: [],
    });

    await refreshDomainVerification();

    expect(mocks.verifySendingDomain).toHaveBeenCalledWith("resend-dom-1");
    expect(mocks.upsertAccountEmailSettings).toHaveBeenCalledWith(ACCOUNT_ID, {
      domain_verification_status: "verified",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/settings/email");
  });
});
