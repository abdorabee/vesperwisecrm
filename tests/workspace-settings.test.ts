import { describe, expect, test } from "vitest";
import {
  DEFAULT_WORKSPACE_SETTINGS,
  formatWorkspaceCurrency,
  formatWorkspaceDate,
  formatWorkspaceDateTime,
  isWorkspaceSettingsSchemaMissing,
  workspaceSettingsFromLegacyAccount,
  workspaceSettingsSchema,
  withArtifactTimezone,
} from "../src/lib/workspace-settings";

describe("workspace settings", () => {
  test("defaults preserve the current USD and device-local behavior", () => {
    expect(DEFAULT_WORKSPACE_SETTINGS).toMatchObject({
      timezone: null,
      currencyCode: "USD",
      dateFormat: "system",
      timeFormat: "system",
    });
  });

  test("normalizes valid workspace input", () => {
    expect(
      workspaceSettingsSchema.parse({
        name: "  VesperWise Egypt  ",
        timezone: "Africa/Cairo",
        currencyCode: "egp",
        dateFormat: "day_month_year",
        timeFormat: "24h",
      }),
    ).toEqual({
      name: "VesperWise Egypt",
      timezone: "Africa/Cairo",
      currencyCode: "EGP",
      dateFormat: "day_month_year",
      timeFormat: "24h",
    });
  });

  test.each([
    ["invalid timezone", { timezone: "Cairo" }],
    ["invalid currency", { currencyCode: "US" }],
    ["invalid date format", { dateFormat: "friendly" }],
    ["invalid time format", { timeFormat: "military" }],
  ])("rejects %s", (_label, override) => {
    expect(() =>
      workspaceSettingsSchema.parse({
        name: "VesperWise",
        timezone: null,
        currencyCode: "USD",
        dateFormat: "system",
        timeFormat: "system",
        ...override,
      }),
    ).toThrow();
  });

  test("formats USD and EGP without hardcoded currency symbols", () => {
    expect(formatWorkspaceCurrency(1250, { currencyCode: "USD" }, "en-US")).toBe("$1,250.00");
    expect(formatWorkspaceCurrency(1250, { currencyCode: "EGP" }, "en-US")).toContain("EGP");
  });

  test("honors workspace date and time preferences", () => {
    const value = "2026-08-09T22:15:00.000Z";
    const settings = {
      timezone: "Africa/Cairo",
      dateFormat: "day_month_year" as const,
      timeFormat: "24h" as const,
    };

    expect(formatWorkspaceDate(value, settings, "en-GB")).toBe("10/08/2026");
    expect(formatWorkspaceDateTime(value, settings, "en-GB")).toContain("01:15");
  });

  test("formats system-default dates together with a time", () => {
    expect(() => formatWorkspaceDateTime("2026-08-09T22:15:00.000Z", {
      timezone: "UTC",
      dateFormat: "system",
      timeFormat: "system",
    }, "en-US")).not.toThrow();
  });

  test("uses UTC for server artifacts only when device timezone is selected", () => {
    expect(withArtifactTimezone({ timezone: null })).toEqual({ timezone: "UTC" });
    expect(withArtifactTimezone({ timezone: "Africa/Cairo" })).toEqual({ timezone: "Africa/Cairo" });
  });

  test.each([
    {
      code: "42703",
      message: "column accounts.timezone does not exist",
    },
    {
      code: "PGRST204",
      message: "Could not find the 'currency_code' column of 'accounts' in the schema cache",
    },
  ])("recognizes a database that has not received the workspace settings migration", (error) => {
    expect(isWorkspaceSettingsSchemaMissing(error)).toBe(true);
  });

  test("does not hide unrelated workspace query errors", () => {
    expect(isWorkspaceSettingsSchemaMissing({ code: "42501", message: "permission denied for table accounts" })).toBe(false);
  });

  test("uses backward-compatible defaults for a legacy account row", () => {
    expect(workspaceSettingsFromLegacyAccount({
      id: "account-1",
      name: "VesperWise",
      created_at: "2026-08-09T10:00:00.000Z",
    })).toEqual({
      id: "account-1",
      name: "VesperWise",
      timezone: null,
      currencyCode: "USD",
      dateFormat: "system",
      timeFormat: "system",
      updatedAt: "2026-08-09T10:00:00.000Z",
    });
  });
});
