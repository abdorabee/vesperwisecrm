import { createClient } from "@/lib/supabase/server";
import { requireAdminAccountId } from "@/lib/supabase/account";
import type { AccountEmailSettings } from "@/lib/email/account-settings";

export async function getAccountEmailSettingsForAdmin(): Promise<AccountEmailSettings | null> {
  const accountId = await requireAdminAccountId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("account_email_settings")
    .select("*")
    .eq("account_id", accountId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
