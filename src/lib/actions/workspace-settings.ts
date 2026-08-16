"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdminAccountId } from "@/lib/supabase/account";
import { requireWritableBilling } from "@/lib/billing/access";
import {
  isWorkspaceSettingsSchemaMissing,
  WORKSPACE_SETTINGS_MIGRATION_REQUIRED_MESSAGE,
  workspaceSettingsSchema,
  type WorkspaceSettingsInput,
} from "@/lib/workspace-settings";

export async function updateWorkspaceSettings(input: WorkspaceSettingsInput): Promise<void> {
  const settings = workspaceSettingsSchema.parse(input);
  const accountId = await requireAdminAccountId();
  await requireWritableBilling(accountId);
  const supabase = await createClient();
  const { error } = await supabase
    .from("accounts")
    .update({
      name: settings.name,
      timezone: settings.timezone,
      currency_code: settings.currencyCode,
      date_format: settings.dateFormat,
      time_format: settings.timeFormat,
    })
    .eq("id", accountId)
    .select("id")
    .single();

  if (error) {
    if (isWorkspaceSettingsSchemaMissing(error)) {
      throw new Error(WORKSPACE_SETTINGS_MIGRATION_REQUIRED_MESSAGE);
    }
    throw new Error(error.message);
  }

  revalidatePath("/", "layout");
  revalidatePath("/settings/workspace");
}
