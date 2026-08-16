"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdminAccountId } from "@/lib/supabase/account";
import { requireWritableBilling } from "@/lib/billing/access";

export async function clearContactEmailOptOut(contactId: string): Promise<void> {
  const accountId = await requireAdminAccountId();
  await requireWritableBilling(accountId);
  const supabase = await createClient();

  const { error } = await supabase
    .from("contacts")
    .update({ email_opted_out_at: null })
    .eq("id", contactId)
    .eq("account_id", accountId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/pipeline");
}
