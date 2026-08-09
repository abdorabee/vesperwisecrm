import { z } from "zod";

export type WorkspaceDateFormat =
  | "system"
  | "month_day_year"
  | "day_month_year"
  | "iso";
export type WorkspaceTimeFormat = "system" | "12h" | "24h";

export interface WorkspaceSettings {
  id: string;
  name: string;
  timezone: string | null;
  currencyCode: string;
  dateFormat: WorkspaceDateFormat;
  timeFormat: WorkspaceTimeFormat;
  updatedAt: string;
}

export interface LegacyAccountWorkspaceRow {
  id: string;
  name: string;
  created_at: string;
}

export const DEFAULT_WORKSPACE_SETTINGS = {
  timezone: null,
  currencyCode: "USD",
  dateFormat: "system" as const,
  timeFormat: "system" as const,
};

const WORKSPACE_SETTINGS_COLUMNS = [
  "timezone",
  "currency_code",
  "date_format",
  "time_format",
  "updated_at",
] as const;

export const WORKSPACE_SETTINGS_MIGRATION_REQUIRED_MESSAGE =
  "Workspace preferences are unavailable until the workspace settings database migration is applied.";

export function isWorkspaceSettingsSchemaMissing(error: {
  code?: string;
  message?: string;
} | null | undefined): boolean {
  if (!error || (error.code !== "42703" && error.code !== "PGRST204")) return false;
  const message = error.message?.toLowerCase() ?? "";
  return WORKSPACE_SETTINGS_COLUMNS.some((column) => message.includes(column));
}

export function workspaceSettingsFromLegacyAccount(
  account: LegacyAccountWorkspaceRow,
): WorkspaceSettings {
  return {
    id: account.id,
    name: account.name,
    ...DEFAULT_WORKSPACE_SETTINGS,
    updatedAt: account.created_at,
  };
}

function isValidTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return value.includes("/") || value === "UTC";
  } catch {
    return false;
  }
}

function isValidCurrency(value: string): boolean {
  try {
    return Intl.supportedValuesOf("currency").includes(value);
  } catch {
    return /^[A-Z]{3}$/.test(value);
  }
}

export const workspaceSettingsSchema = z.object({
  name: z.string().trim().min(1, "Workspace name is required").max(120),
  timezone: z
    .string()
    .trim()
    .nullable()
    .refine((value) => value === null || isValidTimezone(value), "Choose a valid timezone"),
  currencyCode: z
    .string()
    .trim()
    .toUpperCase()
    .refine(isValidCurrency, "Choose a valid ISO currency"),
  dateFormat: z.enum(["system", "month_day_year", "day_month_year", "iso"]),
  timeFormat: z.enum(["system", "12h", "24h"]),
});

export type WorkspaceSettingsInput = z.infer<typeof workspaceSettingsSchema>;

export function withArtifactTimezone<T extends { timezone: string | null }>(settings: T): T & { timezone: string } {
  return { ...settings, timezone: settings.timezone ?? "UTC" };
}

type CurrencyPreferences = Pick<WorkspaceSettings, "currencyCode">;
type DatePreferences = Pick<WorkspaceSettings, "timezone" | "dateFormat">;
type DateTimePreferences = Pick<WorkspaceSettings, "timezone" | "dateFormat" | "timeFormat">;

function dateOptions(settings: DatePreferences): Intl.DateTimeFormatOptions {
  const options: Intl.DateTimeFormatOptions = settings.timezone
    ? { timeZone: settings.timezone }
    : {};

  if (settings.dateFormat === "month_day_year") {
    return { ...options, month: "2-digit", day: "2-digit", year: "numeric" };
  }
  if (settings.dateFormat === "day_month_year") {
    return { ...options, day: "2-digit", month: "2-digit", year: "numeric" };
  }
  if (settings.dateFormat === "iso") {
    return { ...options, year: "numeric", month: "2-digit", day: "2-digit" };
  }
  return { ...options, dateStyle: "medium" };
}

export function formatWorkspaceCurrency(
  value: number,
  settings: CurrencyPreferences,
  locale?: string,
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: settings.currencyCode,
  }).format(value);
}

export function formatWorkspaceDate(
  value: string | number | Date,
  settings: DatePreferences,
  locale?: string,
): string {
  const formatted = new Intl.DateTimeFormat(locale, dateOptions(settings)).format(new Date(value));
  if (settings.dateFormat !== "iso") return formatted;
  const parts = new Intl.DateTimeFormat("en-CA", dateOptions(settings)).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function formatWorkspaceDateTime(
  value: string | number | Date,
  settings: DateTimePreferences,
  locale?: string,
): string {
  const hour12 = settings.timeFormat === "system" ? undefined : settings.timeFormat === "12h";
  const options = settings.dateFormat === "system"
    ? {
        ...(settings.timezone ? { timeZone: settings.timezone } : {}),
        year: "numeric" as const,
        month: "short" as const,
        day: "numeric" as const,
      }
    : dateOptions(settings);
  return new Intl.DateTimeFormat(locale, {
    ...options,
    hour: "2-digit",
    minute: "2-digit",
    hour12,
  }).format(new Date(value));
}

export function formatWorkspaceTime(
  value: string | number | Date,
  settings: Pick<WorkspaceSettings, "timezone" | "timeFormat">,
  locale?: string,
): string {
  return new Intl.DateTimeFormat(locale, {
    ...(settings.timezone ? { timeZone: settings.timezone } : {}),
    hour: "2-digit",
    minute: "2-digit",
    hour12: settings.timeFormat === "system" ? undefined : settings.timeFormat === "12h",
  }).format(new Date(value));
}
