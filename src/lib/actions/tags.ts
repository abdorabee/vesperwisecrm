"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId, requireUserId } from "@/lib/supabase/account";
import { requireWritableBilling } from "@/lib/billing/access";
import { runTriggeredWorkflows } from "@/lib/workflows/engine";
import { createTagSchema } from "@/lib/validations/tag";
import type { Tables } from "@/lib/supabase/types";
import { requireRows } from "@/lib/supabase/require-rows";

export async function createTag(
  name: string,
): Promise<Tables<"tags">> {
  const { name: validatedName } = createTagSchema.parse({ name });
  const accountId = await requireAccountId();
  await requireWritableBilling(accountId);
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("tags")
    .select("*")
    .eq("account_id", accountId)
    .ilike("name", validatedName)
    .maybeSingle();

  if (existing) {
    return existing;
  }

  const { data: tag, error } = await supabase
    .from("tags")
    .insert({ account_id: accountId, name: validatedName })
    .select("*")
    .single();

  if (error || !tag) {
    throw new Error(error?.message ?? "Failed to create tag");
  }

  revalidatePath("/pipeline");
  return tag;
}

export async function addTagToLead(
  leadId: string,
  tagId: string,
  tagName: string,
): Promise<void> {
  const accountId = await requireAccountId();
  await requireWritableBilling(accountId);
  const userId = await requireUserId();
  const supabase = await createClient();

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id")
    .eq("id", leadId)
    .eq("account_id", accountId)
    .maybeSingle();
  const { data: tag, error: tagError } = await supabase
    .from("tags")
    .select("id")
    .eq("id", tagId)
    .eq("account_id", accountId)
    .maybeSingle();
  if (leadError || tagError || !lead || !tag) {
    throw new Error(leadError?.message ?? tagError?.message ?? "Lead or tag not found");
  }

  const { data: inserted, error } = await supabase
    .from("lead_tags")
    .insert({ account_id: accountId, lead_id: leadId, tag_id: tagId })
    .select("lead_id");
  requireRows(inserted, error, "Could not add tag");

  await supabase.from("activities").insert({
    account_id: accountId,
    lead_id: leadId,
    type: "tag_added",
    actor_user_id: userId,
    payload: { tag_name: tagName },
  });

  await runTriggeredWorkflows(supabase, accountId, "tag_added", {
    leadId,
    tagId,
  });

  revalidatePath("/pipeline");
  revalidatePath(`/leads/${leadId}`);
}

export async function removeTagFromLead(
  leadId: string,
  tagId: string,
  tagName: string,
): Promise<void> {
  const accountId = await requireAccountId();
  await requireWritableBilling(accountId);
  const userId = await requireUserId();
  const supabase = await createClient();

  const { data: removed, error } = await supabase
    .from("lead_tags")
    .delete()
    .eq("lead_id", leadId)
    .eq("tag_id", tagId)
    .eq("account_id", accountId)
    .select("lead_id");
  requireRows(removed, error, "Tag not found on this lead");

  await supabase.from("activities").insert({
    account_id: accountId,
    lead_id: leadId,
    type: "tag_removed",
    actor_user_id: userId,
    payload: { tag_name: tagName },
  });

  revalidatePath("/pipeline");
  revalidatePath(`/leads/${leadId}`);
}
