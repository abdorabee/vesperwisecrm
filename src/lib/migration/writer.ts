import type { SupabaseClient } from "@supabase/supabase-js";
import { createLeadRecord } from "@/lib/leads/create-lead";
import {
  releaseAbsorbed,
  removeSeenLead,
  type ImportDedupeSession,
} from "@/lib/migration/dedupe";
import {
  primeImportDedupeSession,
  resolveImportDecision,
} from "@/lib/migration/match-existing";
import { digitsOnly } from "@/lib/migration/normalize";
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

async function attachTag(
  supabase: CRMClient,
  accountId: string,
  leadId: string,
  tagName: string,
): Promise<void> {
  const tagId = await findOrCreateTag(supabase, accountId, tagName);
  if (!tagId) {
    return;
  }
  const { error } = await supabase.from("lead_tags").insert({
    account_id: accountId,
    lead_id: leadId,
    tag_id: tagId,
  });
  if (error && !error.message.toLowerCase().includes("duplicate")) {
    throw new Error(error.message);
  }
}

async function attachNote(
  supabase: CRMClient,
  accountId: string,
  leadId: string,
  actorUserId: string | null,
  note: string,
): Promise<void> {
  const trimmed = note.trim();
  if (!trimmed) {
    return;
  }
  const { error } = await supabase.from("activities").insert({
    account_id: accountId,
    lead_id: leadId,
    type: "note_added",
    actor_user_id: actorUserId,
    payload: { note: trimmed, imported: true } as Json,
  });
  if (error) {
    throw new Error(error.message);
  }
}

async function upgradeStoredPhone(
  supabase: CRMClient,
  accountId: string,
  decision: Awaited<ReturnType<typeof resolveImportDecision>>,
): Promise<void> {
  const phoneE164 = decision.identity.phoneE164;
  const contactId = decision.lead.contactId;
  if (!phoneE164 || !contactId || decision.lead.identity.phoneE164 === phoneE164) {
    return;
  }
  const currentLast10 = decision.lead.identity.phoneLast10;
  const nextLast10 = digitsOnly(phoneE164).slice(-10);
  if (currentLast10 && currentLast10 !== nextLast10) {
    return;
  }
  const { error } = await supabase
    .from("contacts")
    .update({ phone: phoneE164, phone_e164: phoneE164 })
    .eq("id", contactId)
    .eq("account_id", accountId);
  if (error) {
    throw new Error(error.message);
  }
  decision.lead.identity.phoneE164 = phoneE164;
  decision.lead.identity.phoneLast10 = nextLast10;
}

export async function writeCanonicalRecord(
  supabase: CRMClient,
  input: {
    accountId: string;
    actorUserId: string | null;
    record: CanonicalImportRecord;
    stageMap: Record<string, string>;
    pipelineStageId?: string | null;
    session: ImportDedupeSession;
  },
): Promise<{ leadId: string; action: "create" | "skip" | "merge" }> {
  if (!input.record.contact.firstName.trim()) {
    throw new Error("a name column is required");
  }

  if (!input.session.primed) {
    await primeImportDedupeSession(supabase, input.accountId, input.session);
  }

  const decision = await resolveImportDecision(
    supabase,
    input.accountId,
    input.record,
    input.session,
  );

  if (decision.action === "skip") {
    if (!decision.lead.leadId) {
      throw new Error("Duplicate row is missing a lead");
    }
    await upgradeStoredPhone(supabase, input.accountId, decision);
    return { leadId: decision.lead.leadId, action: "skip" };
  }

  if (decision.action === "merge") {
    if (!decision.lead.leadId) {
      throw new Error("Duplicate row is missing a lead");
    }
    try {
      await upgradeStoredPhone(supabase, input.accountId, decision);
      for (const tagName of decision.tagsToAdd) {
        await attachTag(supabase, input.accountId, decision.lead.leadId, tagName);
      }
      for (const note of decision.notesToAdd) {
        await attachNote(
          supabase,
          input.accountId,
          decision.lead.leadId,
          input.actorUserId,
          note,
        );
      }
    } catch (error) {
      releaseAbsorbed(decision.lead, decision.tagsToAdd, decision.notesToAdd);
      throw error;
    }
    return { leadId: decision.lead.leadId, action: "merge" };
  }

  const title =
    input.record.lead.title ||
    input.record.property.addressLine1 ||
    input.record.contact.company ||
    [input.record.contact.firstName, input.record.contact.lastName]
      .filter(Boolean)
      .join(" ") ||
    "Imported lead";

  let createdLeadId: string | null = null;
  try {
    const created = await createLeadRecord(supabase, {
      accountId: input.accountId,
      actorUserId: input.actorUserId,
      title,
      pipelineStageId:
        input.pipelineStageId ??
        resolveStageId(input.record.lead.pipelineStageName, input.stageMap),
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
    createdLeadId = created.leadId;
    decision.lead.leadId = created.leadId;
    decision.lead.contactId = created.contactId;

    for (const tagName of input.record.lead.tags) {
      await attachTag(supabase, input.accountId, created.leadId, tagName);
    }
    for (const note of decision.notesToAdd) {
      await attachNote(
        supabase,
        input.accountId,
        created.leadId,
        input.actorUserId,
        note,
      );
    }
    return { leadId: created.leadId, action: "create" };
  } catch (error) {
    if (!createdLeadId) {
      removeSeenLead(input.session, decision.lead);
    }
    throw error;
  }
}
