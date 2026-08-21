import type { CanonicalImportRecord } from "@/lib/migration/types";

export const CONTACT_FIELD_KEYS = new Set([
  "firstName",
  "lastName",
  "email",
  "phone",
  "company",
  "source",
]);

export const LEAD_FIELD_KEYS = new Set([
  "title",
  "value",
  "pipelineStageName",
  "tags",
  "notes",
]);

export function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function guessMappingFromAliases(
  headers: string[],
  aliases: Record<string, string[]>,
): Record<string, string> {
  const mapping: Record<string, string> = {};
  const claimed = new Set<string>();

  for (const header of headers) {
    const normalized = normalizeHeader(header);
    const match = Object.entries(aliases).find(([, names]) =>
      names.includes(normalized),
    );
    if (match && !claimed.has(match[0])) {
      mapping[header] = match[0];
      claimed.add(match[0]);
    }
  }

  return mapping;
}

export function detectScoreFromAliases(
  headers: string[],
  aliases: Record<string, string[]>,
): number {
  const aliasSet = new Set(Object.values(aliases).flat());
  return headers.filter((header) => aliasSet.has(normalizeHeader(header))).length;
}

export function collectMappedValues(
  row: Record<string, string>,
  mapping: Record<string, string>,
): Record<string, string> {
  const values: Record<string, string> = {};

  for (const [header, fieldKey] of Object.entries(mapping)) {
    if (!fieldKey) {
      continue;
    }
    const value = row[header]?.trim();
    if (value && !values[fieldKey]) {
      values[fieldKey] = value;
    }
  }

  if (!values.firstName && values.fullName) {
    const parts = values.fullName.split(/\s+/).filter(Boolean);
    values.firstName = parts[0] ?? "";
    values.lastName = values.lastName || parts.slice(1).join(" ");
  }

  return values;
}

export function parseTagNames(raw: string | undefined): string[] {
  if (!raw?.trim()) {
    return [];
  }

  return [
    ...new Set(
      raw
        .split(/[,;|]/)
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ];
}

export function collectLeftoverNotes(
  row: Record<string, string>,
  mapping: Record<string, string>,
): string {
  const leftover: string[] = [];

  for (const [header, value] of Object.entries(row)) {
    if (mapping[header]) {
      continue;
    }
    const trimmed = value?.trim();
    if (trimmed) {
      leftover.push(`${header}: ${trimmed}`);
    }
  }

  return leftover.join("\n");
}

export function appendNotes(...parts: Array<string | undefined>): string {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join("\n\n");
}

export function toCanonicalRecord(
  values: Record<string, string>,
  leftoverNotes: string,
  defaultSource: string,
): CanonicalImportRecord {
  const notes = appendNotes(values.notes, leftoverNotes);
  const property: Record<string, string> = {};

  for (const key of Object.keys(values)) {
    if (
      key === "fullName" ||
      CONTACT_FIELD_KEYS.has(key) ||
      LEAD_FIELD_KEYS.has(key)
    ) {
      continue;
    }
    property[key] = values[key];
  }

  const askingPrice = values.askingPrice ?? property.askingPrice ?? "";

  return {
    contact: {
      firstName: values.firstName ?? "",
      lastName: values.lastName ?? "",
      email: values.email ?? "",
      phone: values.phone ?? "",
      company: values.company ?? "",
      source: values.source || defaultSource,
    },
    lead: {
      title: values.title ?? "",
      value: values.value || askingPrice,
      pipelineStageName: values.pipelineStageName ?? "",
      tags: parseTagNames(values.tags),
      notes,
    },
    property,
  };
}

export function mapRowToCanonical(
  row: Record<string, string>,
  mapping: Record<string, string>,
  defaultSource: string,
): CanonicalImportRecord {
  return toCanonicalRecord(
    collectMappedValues(row, mapping),
    collectLeftoverNotes(row, mapping),
    defaultSource,
  );
}
