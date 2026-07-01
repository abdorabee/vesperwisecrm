"use server";

import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/lib/supabase/platform-admin";
import { upsertAccountEmailSettings } from "@/lib/email/account-settings";

export async function suspendAccountOutbound(
  accountId: string,
  reason: string,
): Promise<void> {
  await requirePlatformAdmin();

  await upsertAccountEmailSettings(accountId, {
    outbound_suspended: true,
    suspended_at: new Date().toISOString(),
    suspended_reason: reason.trim() || "Suspended by platform admin",
  });

  revalidatePath("/platform/email");
}

export async function unsuspendAccountOutbound(accountId: string): Promise<void> {
  await requirePlatformAdmin();

  await upsertAccountEmailSettings(accountId, {
    outbound_suspended: false,
    suspended_at: null,
    suspended_reason: null,
  });

  revalidatePath("/platform/email");
}
