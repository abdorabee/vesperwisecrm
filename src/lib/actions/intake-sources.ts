"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { requireAdminAccountId } from "@/lib/supabase/account";
import { hashIntakeToken, mintIntakeToken } from "@/lib/leads/intake-token";

export async function createLeadIntakeSource(
  name: string,
): Promise<{ id: string; token: string }> {
  const accountId = await requireAdminAccountId();
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Name is required");
  }

  const token = mintIntakeToken();
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("lead_intake_sources")
    .insert({
      account_id: accountId,
      name: trimmed,
      token_hash: hashIntakeToken(token),
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not create intake source");
  }

  revalidatePath("/settings/integrations");
  return { id: data.id, token };
}
