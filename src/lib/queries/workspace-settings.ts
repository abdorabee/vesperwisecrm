import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId } from "@/lib/supabase/account";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { Database } from "@/lib/supabase/types";
import {
  blankToNull,
  isWorkspaceMailingSchemaMissing,
  isWorkspaceSettingsSchemaMissing,
  workspaceSettingsFromLegacyAccount,
  type LegacyAccountWorkspaceRow,
  WorkspaceDateFormat,
  type WorkspaceSettings,
  WorkspaceTimeFormat,
} from "@/lib/workspace-settings";

export interface WorkspaceSettingsState {
  settings: WorkspaceSettings;
  schemaAvailable: boolean;
  mailingSchemaAvailable: boolean;
}

const SETTINGS_WITH_MAILING =
  "id, name, timezone, currency_code, date_format, time_format, updated_at, company_name, postal_address";
const SETTINGS_WITHOUT_MAILING =
  "id, name, timezone, currency_code, date_format, time_format, updated_at";

type AccountSettingsRow = {
  id: string;
  name: string;
  timezone: string | null;
  currency_code: string;
  date_format: string;
  time_format: string;
  updated_at: string;
  company_name: string | null;
  postal_address: string | null;
};

function mapWorkspaceSettings(data: AccountSettingsRow): WorkspaceSettings {
  return {
    id: data.id,
    name: data.name,
    timezone: data.timezone,
    currencyCode: data.currency_code,
    dateFormat: data.date_format as WorkspaceDateFormat,
    timeFormat: data.time_format as WorkspaceTimeFormat,
    companyName: blankToNull(data.company_name),
    postalAddress: blankToNull(data.postal_address),
    updatedAt: data.updated_at,
  };
}

async function readWorkspaceAccount(
  supabase: SupabaseClient<Database>,
  accountId: string,
): Promise<
  | { status: "legacy" }
  | { status: "ok"; row: AccountSettingsRow; mailingSchemaAvailable: boolean }
> {
  const full = await supabase
    .from("accounts")
    .select(SETTINGS_WITH_MAILING)
    .eq("id", accountId)
    .single();

  if (!full.error && full.data) {
    return { status: "ok", row: full.data, mailingSchemaAvailable: true };
  }

  if (isWorkspaceSettingsSchemaMissing(full.error)) {
    return { status: "legacy" };
  }

  if (isWorkspaceMailingSchemaMissing(full.error)) {
    const base = await supabase
      .from("accounts")
      .select(SETTINGS_WITHOUT_MAILING)
      .eq("id", accountId)
      .single();
    if (base.error || !base.data) {
      throw new Error(base.error?.message ?? "Workspace not found");
    }
    return {
      status: "ok",
      row: { ...base.data, company_name: null, postal_address: null },
      mailingSchemaAvailable: false,
    };
  }

  throw new Error(full.error?.message ?? "Workspace not found");
}

async function legacyWorkspaceSettings(
  supabase: SupabaseClient<Database>,
  accountId: string,
): Promise<WorkspaceSettingsState> {
  const { data: legacyAccount, error: legacyError } = await supabase
    .from("accounts")
    .select("id, name, created_at")
    .eq("id", accountId)
    .single();
  if (legacyError || !legacyAccount) {
    throw new Error(legacyError?.message ?? "Workspace not found");
  }
  return {
    settings: workspaceSettingsFromLegacyAccount(legacyAccount as LegacyAccountWorkspaceRow),
    schemaAvailable: false,
    mailingSchemaAvailable: false,
  };
}

export const getWorkspaceSettingsState = cache(async (): Promise<WorkspaceSettingsState> => {
  const accountId = await requireAccountId();
  const supabase = await createClient();
  const loaded = await readWorkspaceAccount(supabase, accountId);
  if (loaded.status === "legacy") {
    return legacyWorkspaceSettings(supabase, accountId);
  }

  return {
    settings: mapWorkspaceSettings(loaded.row),
    schemaAvailable: true,
    mailingSchemaAvailable: loaded.mailingSchemaAvailable,
  };
});

export async function getWorkspaceSettings(): Promise<WorkspaceSettings> {
  return (await getWorkspaceSettingsState()).settings;
}

export async function getWorkspaceSettingsForAccount(accountId: string): Promise<WorkspaceSettings> {
  const supabase = createServiceRoleClient();
  const loaded = await readWorkspaceAccount(supabase, accountId);
  if (loaded.status === "legacy") {
    return (await legacyWorkspaceSettings(supabase, accountId)).settings;
  }
  return mapWorkspaceSettings(loaded.row);
}

export async function getWorkspaceMailingIdentity(accountId: string): Promise<{
  companyName: string | null;
  postalAddress: string | null;
}> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("accounts")
    .select("company_name, postal_address")
    .eq("id", accountId)
    .maybeSingle();

  if (error) {
    if (isWorkspaceMailingSchemaMissing(error) || isWorkspaceSettingsSchemaMissing(error)) {
      return { companyName: null, postalAddress: null };
    }
    throw new Error(error.message);
  }

  return {
    companyName: blankToNull(data?.company_name),
    postalAddress: blankToNull(data?.postal_address),
  };
}
