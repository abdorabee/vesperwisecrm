import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { requireAdminAccountId } from "@/lib/supabase/account";
import type { Tables } from "@/lib/supabase/types";

export async function getGoogleIntegration(): Promise<Tables<"google_integrations"> | null> {
  const accountId = await requireAdminAccountId();
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("google_integrations")
    .select("*")
    .eq("account_id", accountId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
