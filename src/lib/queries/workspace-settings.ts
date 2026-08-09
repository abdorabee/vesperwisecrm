import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId } from "@/lib/supabase/account";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
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
}

function mapWorkspaceSettings(data: {
  id: string;
  name: string;
  timezone: string | null;
  currency_code: string;
  date_format: string;
  time_format: string;
  updated_at: string;
}): WorkspaceSettings {
  return {
    id: data.id,
    name: data.name,
    timezone: data.timezone,
    currencyCode: data.currency_code,
    dateFormat: data.date_format as WorkspaceDateFormat,
    timeFormat: data.time_format as WorkspaceTimeFormat,
    updatedAt: data.updated_at,
  };
}

export const getWorkspaceSettingsState = cache(async (): Promise<WorkspaceSettingsState> => {
  const accountId = await requireAccountId();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("accounts")
    .select("id, name, timezone, currency_code, date_format, time_format, updated_at")
    .eq("id", accountId)
    .single();

  if (isWorkspaceSettingsSchemaMissing(error)) {
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
    };
  }

  if (error || !data) {
    throw new Error(error?.message ?? "Workspace not found");
  }

  return { settings: mapWorkspaceSettings(data), schemaAvailable: true };
});

export async function getWorkspaceSettings(): Promise<WorkspaceSettings> {
  return (await getWorkspaceSettingsState()).settings;
}

export async function getWorkspaceSettingsForAccount(accountId: string): Promise<WorkspaceSettings> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("accounts")
    .select("id, name, timezone, currency_code, date_format, time_format, updated_at")
    .eq("id", accountId)
    .single();

  if (isWorkspaceSettingsSchemaMissing(error)) {
    const { data: legacyAccount, error: legacyError } = await supabase
      .from("accounts")
      .select("id, name, created_at")
      .eq("id", accountId)
      .single();
    if (legacyError || !legacyAccount) {
      throw new Error(legacyError?.message ?? "Workspace not found");
    }
    return workspaceSettingsFromLegacyAccount(legacyAccount as LegacyAccountWorkspaceRow);
  }

  if (error || !data) throw new Error(error?.message ?? "Workspace not found");
  return mapWorkspaceSettings(data);
}
