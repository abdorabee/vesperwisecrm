"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdminAccountId } from "@/lib/supabase/account";

export async function createTvDisplayTokenAction(name: string): Promise<void> {
  const accountId = await requireAdminAccountId();
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Display name is required");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("tv_display_tokens").insert({
    account_id: accountId,
    name: trimmed,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/team");
}

export async function revokeTvDisplayTokenAction(id: string): Promise<void> {
  const accountId = await requireAdminAccountId();
  const supabase = await createClient();

  const { error } = await supabase
    .from("tv_display_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("account_id", accountId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/team");
}
