"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId, requireUserId } from "@/lib/supabase/account";

export async function completeOnboardingTour(): Promise<void> {
  const accountId = await requireAccountId();
  const userId = await requireUserId();
  const supabase = await createClient();

  const { error } = await supabase
    .from("account_members")
    .update({ onboarding_tour_completed_at: new Date().toISOString() })
    .eq("account_id", accountId)
    .eq("user_id", userId)
    .select("onboarding_tour_completed_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/settings/profile");
}
