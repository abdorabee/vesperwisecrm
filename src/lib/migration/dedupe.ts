import { formatDuplicatesSkippedMerged } from "@/lib/migration/duplicate-summary";
import {
  collapseWhitespace,
  digitsOnly,
  normalizeAddressKey,
  normalizePhoneToE164,
  ownerNameKey,
} from "@/lib/migration/normalize";
import type { CanonicalImportRecord } from "@/lib/migration/types";

export { formatDuplicatesSkippedMerged };

export function countDuplicateActions(
  actions: Array<{ action: string }>,
): number {
  return actions.filter(
    (action) => action.action === "skip" || action.action === "merge",
  ).length;
}

export interface ImportIdentity {
  rawPhone: string;
  phoneE164: string | null;
  phoneDigits: string;
  phoneLast10: string;
  email: string;
  ownerName: string;
  addressKey: string;
}

export interface SeenLead {
  leadId: string | null;
  contactId: string | null;
  fromDatabase: boolean;
  identity: ImportIdentity;
  tags: Set<string>;
  notes: Set<string>;
}

export interface ImportDedupeSession {
  seen: SeenLead[];
  primed: boolean;
  digitCache: Map<string, string>;
  expandedLeadIds: Set<string>;
}

export interface ImportDecision {
  action: "create" | "skip" | "merge";
  lead: SeenLead;
  identity: ImportIdentity;
  tagsToAdd: string[];
  notesToAdd: string[];
}

export function createImportDedupeSession(): ImportDedupeSession {
  return {
    seen: [],
    primed: false,
    digitCache: new Map(),
    expandedLeadIds: new Set(),
  };
}

export function normalizeNoteKey(value: string): string {
  return collapseWhitespace(value).toLowerCase();
}

export function normalizeTagKey(value: string): string {
  return collapseWhitespace(value).toLowerCase();
}

export function identityFromCanonical(
  record: CanonicalImportRecord,
): ImportIdentity {
  const rawPhone = record.contact.phone.trim();
  const phoneE164 = normalizePhoneToE164(rawPhone);
  const phoneDigits = digitsOnly(phoneE164 ?? rawPhone);
  return {
    rawPhone,
    phoneE164,
    phoneDigits,
    phoneLast10: phoneDigits.length >= 10 ? phoneDigits.slice(-10) : "",
    email: record.contact.email.trim().toLowerCase(),
    ownerName: ownerNameKey(record.contact.firstName, record.contact.lastName),
    addressKey: normalizeAddressKey({
      addressLine1: record.property.addressLine1,
      addressLine2: record.property.addressLine2,
      city: record.property.city,
      state: record.property.state,
      postalCode: record.property.postalCode,
    }),
  };
}

export function incomingTags(record: CanonicalImportRecord): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const tag of record.lead.tags) {
    const key = normalizeTagKey(tag);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    tags.push(collapseWhitespace(tag));
  }
  return tags;
}

export function incomingNotes(record: CanonicalImportRecord): string[] {
  const seen = new Set<string>();
  const notes: string[] = [];
  for (const note of [record.lead.notes, record.property.notes]) {
    if (!note?.trim()) {
      continue;
    }
    const key = normalizeNoteKey(note);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    notes.push(note.trim());
  }
  return notes;
}

function addressParts(key: string): {
  line: string;
  city: string;
  state: string;
  postal: string;
} {
  const [line = "", city = "", state = "", postal = ""] = key.split("|");
  return { line, city, state, postal };
}

export function addressesMatch(leftKey: string, rightKey: string): boolean {
  const left = addressParts(leftKey);
  const right = addressParts(rightKey);
  if (!left.line || !right.line || left.line !== right.line) {
    return false;
  }
  if (left.city && right.city && left.city !== right.city) {
    return false;
  }
  if (left.state && right.state && left.state !== right.state) {
    return false;
  }
  if (left.postal && right.postal && left.postal !== right.postal) {
    return false;
  }
  return true;
}

export function identitiesMatch(left: ImportIdentity, right: ImportIdentity): boolean {
  const phone =
    left.phoneLast10.length >= 10 && left.phoneLast10 === right.phoneLast10;
  const email = left.email.length > 0 && left.email === right.email;
  const name = left.ownerName.length > 0 && left.ownerName === right.ownerName;
  const address = addressesMatch(left.addressKey, right.addressKey);
  const bothAddresses =
    addressParts(left.addressKey).line.length > 0 &&
    addressParts(right.addressKey).line.length > 0;

  if (bothAddresses && !address) {
    return false;
  }
  if (name && address) {
    return true;
  }
  if (phone && (!bothAddresses || address)) {
    return true;
  }
  if (email && (!bothAddresses || address)) {
    return true;
  }
  return false;
}

export function matchScore(left: ImportIdentity, right: ImportIdentity): number {
  if (!identitiesMatch(left, right)) {
    return 0;
  }

  let score = 1;
  if (left.phoneLast10.length >= 10 && left.phoneLast10 === right.phoneLast10) {
    score += 4;
  }
  if (left.email && left.email === right.email) {
    score += 3;
  }
  if (addressesMatch(left.addressKey, right.addressKey)) {
    score += 2;
  }
  if (
    left.ownerName &&
    left.ownerName === right.ownerName &&
    addressesMatch(left.addressKey, right.addressKey)
  ) {
    score += 3;
  }
  return score;
}

export function bestSeenLead(
  identity: ImportIdentity,
  leads: SeenLead[],
): SeenLead | null {
  let best: SeenLead | null = null;
  let bestScore = 0;
  for (const lead of leads) {
    const score = matchScore(identity, lead.identity);
    if (score > bestScore) {
      best = lead;
      bestScore = score;
    }
  }
  return best;
}

export function tagsToAdd(tags: string[], lead: SeenLead): string[] {
  return tags.filter((tag) => {
    const key = normalizeTagKey(tag);
    return key.length > 0 && !lead.tags.has(key);
  });
}

export function notesToAdd(notes: string[], lead: SeenLead): string[] {
  return notes.filter((note) => {
    const key = normalizeNoteKey(note);
    return key.length > 0 && !lead.notes.has(key);
  });
}

export function absorbIntoLead(
  lead: SeenLead,
  tags: string[],
  notes: string[],
): void {
  for (const tag of tags) {
    const key = normalizeTagKey(tag);
    if (key) {
      lead.tags.add(key);
    }
  }
  for (const note of notes) {
    const key = normalizeNoteKey(note);
    if (key) {
      lead.notes.add(key);
    }
  }
}

export function releaseAbsorbed(
  lead: SeenLead,
  tags: string[],
  notes: string[],
): void {
  for (const tag of tags) {
    lead.tags.delete(normalizeTagKey(tag));
  }
  for (const note of notes) {
    lead.notes.delete(normalizeNoteKey(note));
  }
}

export function removeSeenLead(
  session: ImportDedupeSession,
  lead: SeenLead,
): void {
  const index = session.seen.indexOf(lead);
  if (index >= 0) {
    session.seen.splice(index, 1);
  }
}

function cloneSeen(lead: SeenLead): SeenLead {
  return {
    ...lead,
    identity: { ...lead.identity },
    tags: new Set(lead.tags),
    notes: new Set(lead.notes),
  };
}

export function planImportBatch(
  records: CanonicalImportRecord[],
  existing: SeenLead[],
): { actions: Array<{ action: "create" | "skip" | "merge" }>; leads: SeenLead[] } {
  const leads = existing.map(cloneSeen);
  const actions: Array<{ action: "create" | "skip" | "merge" }> = [];

  for (const record of records) {
    const identity = identityFromCanonical(record);
    const tags = incomingTags(record);
    const notes = incomingNotes(record);
    const match = bestSeenLead(identity, leads);
    if (!match) {
      leads.push({
        leadId: `planned-${leads.length + 1}`,
        contactId: null,
        fromDatabase: false,
        identity,
        tags: new Set(tags.map(normalizeTagKey).filter(Boolean)),
        notes: new Set(notes.map(normalizeNoteKey).filter(Boolean)),
      });
      actions.push({ action: "create" });
      continue;
    }

    const addedTags = tagsToAdd(tags, match);
    const addedNotes = notesToAdd(notes, match);
    const action = addedTags.length > 0 || addedNotes.length > 0 ? "merge" : "skip";
    if (action === "merge") {
      absorbIntoLead(match, addedTags, addedNotes);
    }
    actions.push({ action });
  }

  return { actions, leads };
}

export function duplicateCountForRecords(
  records: CanonicalImportRecord[],
  existing: SeenLead[] = [],
): number {
  return countDuplicateActions(planImportBatch(records, existing).actions);
}
