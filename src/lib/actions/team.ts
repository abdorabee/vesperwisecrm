"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdminAccountId } from "@/lib/supabase/account";
import {
  updateMemberRestrictionsSchema,
  type UpdateMemberRestrictionsInput,
} from "@/lib/validations/team";

export async function updateMemberRestrictions(
  userId: string,
  input: UpdateMemberRestrictionsInput,
): Promise<void> {
  const data = updateMemberRestrictionsSchema.parse(input);
  const accountId = await requireAdminAccountId();
  const supabase = await createClient();

  const { error } = await supabase
    .from("account_members")
    .update({
      lead_visibility: data.leadVisibility,
      max_open_leads: data.maxOpenLeads ? Number(data.maxOpenLeads) : null,
    })
    .eq("account_id", accountId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/team");
}
