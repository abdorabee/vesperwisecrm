import type { SupabaseClient } from "@supabase/supabase-js";
import {
  absorbIntoLead,
  bestSeenLead,
  createImportDedupeSession,
  identityFromCanonical,
  incomingNotes,
  incomingTags,
  matchScore,
  normalizeNoteKey,
  normalizeTagKey,
  notesToAdd,
  tagsToAdd,
  type ImportDecision,
  type ImportDedupeSession,
  type ImportIdentity,
  type SeenLead,
} from "@/lib/migration/dedupe";
import type { CanonicalImportRecord } from "@/lib/migration/types";
import type { Database, Json } from "@/lib/supabase/types";

type CRMClient = SupabaseClient<Database>;

const LEAD_SELECT =
  "id, contact_id, contact:contact_id(id, first_name, last_name, email, phone, phone_e164, deleted_at), property:lead_properties(address_line1, address_line2, city, state, postal_code, notes), tags:lead_tags(tag:tag_id(name))";

interface ContactEmbed {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  phone_e164: string | null;
  deleted_at: string | null;
}

interface PropertyEmbed {
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  notes: string | null;
}

interface LeadEmbedRow {
  id: string;
  contact_id: string;
  contact: ContactEmbed | ContactEmbed[] | null;
  property: PropertyEmbed | PropertyEmbed[] | null;
  tags: { tag: { name: string } | { name: string }[] | null }[] | null;
}

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function readNote(payload: Json | null): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  const note = payload.note;
  return typeof note === "string" ? note : null;
}

function readTagNames(tags: LeadEmbedRow["tags"]): string[] {
  if (!tags) {
    return [];
  }
  const names: string[] = [];
  for (const entry of tags) {
    const tag = unwrap(entry.tag);
    if (tag?.name) {
      names.push(tag.name);
    }
  }
  return names;
}

function seenFromRow(row: LeadEmbedRow, notes: Set<string>): SeenLead | null {
  const contact = unwrap(row.contact);
  if (!contact || contact.deleted_at) {
    return null;
  }
  const property = unwrap(row.property);
  const identity = identityFromCanonical({
    contact: {
      firstName: contact.first_name ?? "",
      lastName: contact.last_name ?? "",
      email: contact.email ?? "",
      phone: contact.phone_e164 || contact.phone || "",
      company: "",
      source: "",
    },
    lead: {
      title: "",
      value: "",
      pipelineStageName: "",
      tags: [],
      notes: "",
    },
    property: {
      addressLine1: property?.address_line1 ?? "",
      addressLine2: property?.address_line2 ?? "",
      city: property?.city ?? "",
      state: property?.state ?? "",
      postalCode: property?.postal_code ?? "",
      notes: property?.notes ?? "",
    },
  });
  if (property?.notes) {
    const key = normalizeNoteKey(property.notes);
    if (key) {
      notes.add(key);
    }
  }
  return {
    leadId: row.id,
    contactId: contact.id,
    fromDatabase: true,
    identity,
    tags: new Set(readTagNames(row.tags).map(normalizeTagKey).filter(Boolean)),
    notes,
  };
}

async function fetchLeadRows(
  supabase: CRMClient,
  accountId: string,
  leadIds?: string[],
): Promise<LeadEmbedRow[]> {
  const pageSize = 1000;
  const rows: LeadEmbedRow[] = [];
  for (let from = 0; ; from += pageSize) {
    let query = supabase
      .from("leads")
      .select(LEAD_SELECT)
      .eq("account_id", accountId)
      .is("deleted_at", null);
    if (leadIds) {
      query = query.in("id", leadIds);
    }
    const { data, error } = await query.range(from, from + pageSize - 1);
    if (error) {
      throw new Error(error.message);
    }
    const chunk = (data ?? []) as unknown as LeadEmbedRow[];
    rows.push(...chunk);
    if (chunk.length < pageSize) {
      break;
    }
  }
  return rows;
}

async function fetchNoteKeys(
  supabase: CRMClient,
  accountId: string,
  leadIds?: string[],
): Promise<Map<string, Set<string>>> {
  const pageSize = 1000;
  const notes = new Map<string, Set<string>>();
  for (let from = 0; ; from += pageSize) {
    let query = supabase
      .from("activities")
      .select("lead_id, payload")
      .eq("account_id", accountId)
      .eq("type", "note_added");
    if (leadIds) {
      query = query.in("lead_id", leadIds);
    }
    const { data, error } = await query.range(from, from + pageSize - 1);
    if (error) {
      throw new Error(error.message);
    }
    const chunk = data ?? [];
    for (const row of chunk) {
      const note = readNote(row.payload);
      const key = note ? normalizeNoteKey(note) : "";
      if (!key) {
        continue;
      }
      const set = notes.get(row.lead_id) ?? new Set<string>();
      set.add(key);
      notes.set(row.lead_id, set);
    }
    if (chunk.length < pageSize) {
      break;
    }
  }
  return notes;
}

function rememberRows(session: ImportDedupeSession, rows: LeadEmbedRow[], notes: Map<string, Set<string>>) {
  const known = new Set(session.seen.map((lead) => lead.leadId).filter(Boolean));
  for (const row of rows) {
    if (known.has(row.id)) {
      continue;
    }
    const seen = seenFromRow(row, new Set(notes.get(row.id) ?? []));
    if (seen) {
      session.seen.push(seen);
      known.add(row.id);
    }
  }
}

export async function primeImportDedupeSession(
  supabase: CRMClient,
  accountId: string,
  session: ImportDedupeSession,
): Promise<void> {
  if (session.primed) {
    return;
  }
  const [rows, notes] = await Promise.all([
    fetchLeadRows(supabase, accountId),
    fetchNoteKeys(supabase, accountId),
  ]);
  rememberRows(session, rows, notes);
  session.primed = true;
}

async function applyDatabasePhoneDigits(
  supabase: CRMClient,
  session: ImportDedupeSession,
  identity: ImportIdentity,
): Promise<void> {
  const source = identity.rawPhone.trim();
  const hasStoredPhone = session.seen.some(
    (lead) => lead.fromDatabase && lead.identity.phoneLast10.length >= 10,
  );
  if (!source || !hasStoredPhone) {
    return;
  }

  let digits = session.digitCache.get(source);
  if (digits === undefined) {
    const { data, error } = await supabase.rpc("smart_search_digits", {
      p_value: source,
    });
    if (error) {
      throw new Error(error.message);
    }
    digits = data ?? "";
    session.digitCache.set(source, digits);
  }

  identity.phoneDigits = digits;
  identity.phoneLast10 = digits.length >= 10 ? digits.slice(-10) : "";
}

async function expandRelatedLeads(
  supabase: CRMClient,
  accountId: string,
  session: ImportDedupeSession,
  identity: ImportIdentity,
  match: SeenLead,
): Promise<SeenLead> {
  if (!match.fromDatabase || !match.leadId || session.expandedLeadIds.has(match.leadId)) {
    return match;
  }
  session.expandedLeadIds.add(match.leadId);

  const { data, error } = await supabase.rpc("get_related_leads", {
    p_account_id: accountId,
    p_lead_id: match.leadId,
    p_limit: 8,
  });
  if (error) {
    throw new Error(error.message);
  }

  const relatedIds = (data ?? [])
    .filter((row) => row.relevance >= 80)
    .map((row) => row.lead_id);
  const missing = relatedIds.filter(
    (leadId) => !session.seen.some((lead) => lead.leadId === leadId),
  );
  if (missing.length > 0) {
    const [rows, notes] = await Promise.all([
      fetchLeadRows(supabase, accountId, missing),
      fetchNoteKeys(supabase, accountId, missing),
    ]);
    rememberRows(session, rows, notes);
  }

  let best = match;
  let bestScore = matchScore(identity, match.identity);
  for (const leadId of relatedIds) {
    const related = session.seen.find((lead) => lead.leadId === leadId);
    if (!related) {
      continue;
    }
    const score = matchScore(identity, related.identity);
    if (score > bestScore) {
      best = related;
      bestScore = score;
    }
  }
  return best;
}

export async function resolveImportDecision(
  supabase: CRMClient,
  accountId: string,
  record: CanonicalImportRecord,
  session: ImportDedupeSession,
): Promise<ImportDecision> {
  if (!session.primed) {
    await primeImportDedupeSession(supabase, accountId, session);
  }

  const identity = identityFromCanonical(record);
  const tags = incomingTags(record);
  const notes = incomingNotes(record);
  await applyDatabasePhoneDigits(supabase, session, identity);

  let match = bestSeenLead(identity, session.seen);
  if (match) {
    match = await expandRelatedLeads(supabase, accountId, session, identity, match);
  }

  if (!match) {
    const lead: SeenLead = {
      leadId: null,
      contactId: null,
      fromDatabase: false,
      identity,
      tags: new Set(tags.map(normalizeTagKey).filter(Boolean)),
      notes: new Set(notes.map(normalizeNoteKey).filter(Boolean)),
    };
    session.seen.push(lead);
    return {
      action: "create",
      lead,
      identity,
      tagsToAdd: tags,
      notesToAdd: notes,
    };
  }

  const addedTags = tagsToAdd(tags, match);
  const addedNotes = notesToAdd(notes, match);
  const action = addedTags.length > 0 || addedNotes.length > 0 ? "merge" : "skip";
  if (action === "merge") {
    absorbIntoLead(match, addedTags, addedNotes);
  }
  return {
    action,
    lead: match,
    identity,
    tagsToAdd: addedTags,
    notesToAdd: addedNotes,
  };
}

export async function countImportDuplicates(
  supabase: CRMClient,
  accountId: string,
  records: CanonicalImportRecord[],
): Promise<number> {
  const session = createImportDedupeSession();
  await primeImportDedupeSession(supabase, accountId, session);
  let duplicates = 0;
  for (const record of records) {
    const decision = await resolveImportDecision(
      supabase,
      accountId,
      record,
      session,
    );
    if (decision.action !== "create") {
      duplicates += 1;
    }
  }
  return duplicates;
}
