import type { SupabaseClient } from "@supabase/supabase-js";
import { createLeadRecord } from "@/lib/leads/create-lead";
import type { CanonicalImportRecord } from "@/lib/migration/types";
import {
  optionalNumber,
  propertyInputFromCanonical,
  resolveStageId,
} from "@/lib/migration/writer-helpers";
import type { Database, Json } from "@/lib/supabase/types";

type CRMClient = SupabaseClient<Database>;

async function findOrCreateTag(
  supabase: CRMClient,
  accountId: string,
  name: string,
): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) {
    return null;
  }

  const { data: existing, error: existingError } = await supabase
    .from("tags")
    .select("id")
    .eq("account_id", accountId)
    .ilike("name", trimmed)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    return existing.id;
  }

  const { data: created, error: createError } = await supabase
    .from("tags")
    .insert({ account_id: accountId, name: trimmed })
    .select("id")
    .single();

  if (createError || !created) {
    throw new Error(createError?.message ?? "Failed to create tag");
  }

  return created.id;
}

export async function writeCanonicalRecord(
  supabase: CRMClient,
  input: {
    accountId: string;
    actorUserId: string | null;
    record: CanonicalImportRecord;
    stageMap: Record<string, string>;
  },
): Promise<{ leadId: string }> {
  if (!input.record.contact.firstName.trim()) {
    throw new Error("a name column is required");
  }

  const title =
    input.record.lead.title ||
    input.record.property.addressLine1 ||
    input.record.contact.company ||
    [input.record.contact.firstName, input.record.contact.lastName]
      .filter(Boolean)
      .join(" ") ||
    "Imported lead";

  const { leadId } = await createLeadRecord(supabase, {
    accountId: input.accountId,
    actorUserId: input.actorUserId,
    title,
    pipelineStageId: resolveStageId(
      input.record.lead.pipelineStageName,
      input.stageMap,
    ),
    firstName: input.record.contact.firstName,
    lastName: input.record.contact.lastName,
    email: input.record.contact.email,
    phone: input.record.contact.phone,
    company: input.record.contact.company,
    source: input.record.contact.source,
    value: optionalNumber(input.record.lead.value),
    property: {
      ...propertyInputFromCanonical(input.record.property),
      notes: input.record.property.notes || input.record.lead.notes || undefined,
    },
    notifyMembers: false,
  });

  for (const tagName of input.record.lead.tags) {
    const tagId = await findOrCreateTag(supabase, input.accountId, tagName);
    if (!tagId) {
      continue;
    }
    const { error } = await supabase.from("lead_tags").insert({
      account_id: input.accountId,
      lead_id: leadId,
      tag_id: tagId,
    });
    if (error && !error.message.toLowerCase().includes("duplicate")) {
      throw new Error(error.message);
    }
  }

  if (input.record.lead.notes.trim()) {
    const { error } = await supabase.from("activities").insert({
      account_id: input.accountId,
      lead_id: leadId,
      type: "note_added",
      actor_user_id: input.actorUserId,
      payload: { note: input.record.lead.notes, imported: true } as Json,
    });
    if (error) {
      throw new Error(error.message);
    }
  }

  return { leadId };
}
