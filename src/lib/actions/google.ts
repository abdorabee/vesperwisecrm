"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  requireAccountId,
  requireAdminAccountId,
  requireUserId,
} from "@/lib/supabase/account";
import { generatePropertyReportDoc } from "@/lib/google/generate-report";
import { getLeadDetail } from "@/lib/queries/leads";

export async function generateLeadReport(
  leadId: string,
): Promise<{ url: string }> {
  const accountId = await requireAccountId();
  const userId = await requireUserId();
  const supabase = await createClient();
  const lead = await getLeadDetail(leadId);

  const url = await generatePropertyReportDoc(accountId, lead);

  const { error } = await supabase
    .from("leads")
    .update({ google_doc_url: url })
    .eq("id", leadId)
    .eq("account_id", accountId);

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("activities").insert({
    account_id: accountId,
    lead_id: leadId,
    type: "report_generated",
    actor_user_id: userId,
    payload: { url },
  });

  revalidatePath(`/leads/${leadId}`);

  return { url };
}

export async function disconnectGoogle(): Promise<void> {
  const accountId = await requireAdminAccountId();
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from("google_integrations")
    .delete()
    .eq("account_id", accountId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings/google");
}

export async function updateDriveFolder(folderId: string): Promise<void> {
  const accountId = await requireAdminAccountId();
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from("google_integrations")
    .update({
      drive_folder_id: folderId.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("account_id", accountId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings/google");
}
