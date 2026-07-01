"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId, requireUserId } from "@/lib/supabase/account";
import { runTriggeredWorkflows } from "@/lib/workflows/engine";
import { createTagSchema } from "@/lib/validations/tag";
import type { Tables } from "@/lib/supabase/types";

export async function createTag(
  name: string,
): Promise<Tables<"tags">> {
  const { name: validatedName } = createTagSchema.parse({ name });
  const accountId = await requireAccountId();
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
  const userId = await requireUserId();
  const supabase = await createClient();

  const { error } = await supabase
    .from("lead_tags")
    .insert({ account_id: accountId, lead_id: leadId, tag_id: tagId });

  if (error) {
    throw new Error(error.message);
  }

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
  const userId = await requireUserId();
  const supabase = await createClient();

  const { error } = await supabase
    .from("lead_tags")
    .delete()
    .eq("lead_id", leadId)
    .eq("tag_id", tagId);

  if (error) {
    throw new Error(error.message);
  }

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
