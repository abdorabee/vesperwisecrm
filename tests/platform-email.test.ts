import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requirePlatformAdmin: vi.fn(),
  upsertAccountEmailSettings: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/supabase/platform-admin", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/supabase/platform-admin")>();
  return {
    ...actual,
    requirePlatformAdmin: mocks.requirePlatformAdmin,
  };
});

vi.mock("@/lib/email/account-settings", () => ({
  upsertAccountEmailSettings: mocks.upsertAccountEmailSettings,
}));

import {
  suspendAccountOutbound,
  unsuspendAccountOutbound,
} from "@/lib/actions/platform-email";
import {
  getPlatformAdminEmails,
  isPlatformAdminEmail,
} from "@/lib/supabase/platform-admin";

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const ADMIN_USER_ID = "admin-user-1";
const SUSPENDED_AT = "2026-11-20T12:00:00.000Z";

describe("platform admin allowlist", () => {
  const original = process.env.PLATFORM_ADMIN_EMAILS;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.PLATFORM_ADMIN_EMAILS;
    } else {
      process.env.PLATFORM_ADMIN_EMAILS = original;
    }
  });

  test("returns an empty allowlist and rejects emails when unset", () => {
    delete process.env.PLATFORM_ADMIN_EMAILS;

    expect(getPlatformAdminEmails()).toEqual([]);
    expect(isPlatformAdminEmail("admin@example.com")).toBe(false);
  });

  test("returns an empty allowlist and rejects emails when blank", () => {
    process.env.PLATFORM_ADMIN_EMAILS = "   ";

    expect(getPlatformAdminEmails()).toEqual([]);
    expect(isPlatformAdminEmail("admin@example.com")).toBe(false);
  });

  test("trims, lowercases, and ignores empty comma segments", () => {
    process.env.PLATFORM_ADMIN_EMAILS =
      "  Admin@Example.com , , other@x.com,";

    expect(getPlatformAdminEmails()).toEqual([
      "admin@example.com",
      "other@x.com",
    ]);
    expect(isPlatformAdminEmail("ADMIN@example.com")).toBe(true);
    expect(isPlatformAdminEmail("  other@x.com  ")).toBe(true);
    expect(isPlatformAdminEmail("nobody@x.com")).toBe(false);
  });

  test("returns false for null or undefined email", () => {
    process.env.PLATFORM_ADMIN_EMAILS = "admin@example.com";

    expect(isPlatformAdminEmail(null)).toBe(false);
    expect(isPlatformAdminEmail(undefined)).toBe(false);
  });
});

describe("suspendAccountOutbound / unsuspendAccountOutbound", () => {
  beforeEach(() => {
    mocks.revalidatePath.mockReset();
    mocks.requirePlatformAdmin.mockReset();
    mocks.upsertAccountEmailSettings.mockReset();
    mocks.requirePlatformAdmin.mockResolvedValue(ADMIN_USER_ID);
    mocks.upsertAccountEmailSettings.mockResolvedValue({});
    vi.useFakeTimers();
    vi.setSystemTime(new Date(SUSPENDED_AT));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("suspends outbound with a trimmed reason", async () => {
    await suspendAccountOutbound(ACCOUNT_ID, "  abuse  ");

    expect(mocks.requirePlatformAdmin).toHaveBeenCalledTimes(1);
    expect(mocks.upsertAccountEmailSettings).toHaveBeenCalledWith(ACCOUNT_ID, {
      outbound_suspended: true,
      suspended_at: SUSPENDED_AT,
      suspended_reason: "abuse",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/platform/email");
  });

  test("uses the default reason when the given reason is blank", async () => {
    await suspendAccountOutbound(ACCOUNT_ID, "   ");

    expect(mocks.upsertAccountEmailSettings).toHaveBeenCalledWith(ACCOUNT_ID, {
      outbound_suspended: true,
      suspended_at: SUSPENDED_AT,
      suspended_reason: "Suspended by platform admin",
    });
  });

  test("unsuspends outbound and clears the suspension fields", async () => {
    await unsuspendAccountOutbound(ACCOUNT_ID);

    expect(mocks.requirePlatformAdmin).toHaveBeenCalledTimes(1);
    expect(mocks.upsertAccountEmailSettings).toHaveBeenCalledWith(ACCOUNT_ID, {
      outbound_suspended: false,
      suspended_at: null,
      suspended_reason: null,
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/platform/email");
  });

  test("does not upsert when requirePlatformAdmin throws", async () => {
    mocks.requirePlatformAdmin.mockRejectedValue(
      new Error("Platform admin access required"),
    );

    await expect(suspendAccountOutbound(ACCOUNT_ID, "abuse")).rejects.toThrow(
      "Platform admin access required",
    );
    await expect(unsuspendAccountOutbound(ACCOUNT_ID)).rejects.toThrow(
      "Platform admin access required",
    );

    expect(mocks.upsertAccountEmailSettings).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
