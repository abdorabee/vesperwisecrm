// Shared CSV parsing + field-mapping for lead migration. Column names vary
// wildly across exports (Podio, REsimpli, InvestorFuse, Google Sheets), so
// import is mapping-driven rather than assuming a fixed header format --
// guessMapping() just pre-fills the mapping UI with best-effort matches.

import { genericAdapter } from "@/lib/migration/adapters/generic";
import {
  guessMappingFromAliases,
  normalizeHeader as normalizeCsvHeader,
} from "@/lib/migration/mapping";

export { normalizeCsvHeader as normalizeHeader };

export type CsvRow = Record<string, string>;

export function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

export interface ParsedCsv {
  headers: string[];
  rows: CsvRow[];
}

export function parseCsv(text: string): ParsedCsv {
  const lines = text
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("CSV must include a header row and at least one lead row");
  }

  const headers = parseCsvLine(lines[0]);

  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return headers.reduce<CsvRow>((row, header, index) => {
      row[header] = values[index]?.trim() ?? "";
      return row;
    }, {});
  });

  return { headers, rows };
}

export const CRM_FIELD_GROUPS: {
  label: string;
  fields: { key: string; label: string }[];
}[] = [
  {
    label: "Contact",
    fields: [
      { key: "fullName", label: "Full name" },
      { key: "firstName", label: "First name" },
      { key: "lastName", label: "Last name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "company", label: "Company" },
      { key: "source", label: "Source" },
    ],
  },
  {
    label: "Lead",
    fields: [
      { key: "title", label: "Title" },
      { key: "value", label: "Value" },
    ],
  },
  {
    label: "Property",
    fields: [
      { key: "addressLine1", label: "Address" },
      { key: "addressLine2", label: "Address line 2" },
      { key: "city", label: "City" },
      { key: "state", label: "State" },
      { key: "postalCode", label: "Postal code" },
      { key: "propertyType", label: "Property type" },
      { key: "bedrooms", label: "Beds" },
      { key: "bathrooms", label: "Baths" },
      { key: "squareFeet", label: "Square feet" },
    ],
  },
  {
    label: "Deal",
    fields: [
      { key: "askingPrice", label: "Asking price" },
      { key: "estimatedValue", label: "Estimated value" },
      { key: "contractStatus", label: "Contract status" },
      { key: "contractAmount", label: "Contract amount" },
      { key: "contractCloseDate", label: "Contract close date" },
    ],
  },
  {
    label: "Acquisition intake",
    fields: [
      { key: "condition", label: "Condition" },
      { key: "updatesDone", label: "Updates done" },
      { key: "updatesNeeded", label: "Updates needed" },
      { key: "occupancyStatus", label: "Occupancy" },
      { key: "tenantDurationRent", label: "Tenant duration & rent" },
      { key: "motivation", label: "Motivation" },
      { key: "timeline", label: "Timeline" },
      { key: "workNeeded", label: "Work needed" },
      { key: "roofCondition", label: "Roof" },
      { key: "flooringCondition", label: "Flooring" },
      { key: "kitchenBathCondition", label: "Kitchen / bath" },
      { key: "mortgage", label: "Mortgage" },
      { key: "frameSidingCondition", label: "Frame / siding" },
      { key: "windowsCondition", label: "Windows" },
      { key: "basementType", label: "Basement" },
      { key: "wallsCondition", label: "Walls" },
      { key: "electricalPlumbingCondition", label: "Electrical / plumbing" },
      { key: "furnaceCondition", label: "Furnace" },
      { key: "waterHeaterCondition", label: "Water heater" },
      { key: "acCondition", label: "AC" },
      { key: "followUpContact", label: "Follow-up contact" },
      { key: "notes", label: "Notes" },
    ],
  },
];

export const CRM_FIELD_KEYS: string[] = CRM_FIELD_GROUPS.flatMap((group) =>
  group.fields.map((field) => field.key),
);

export function guessMapping(headers: string[]): Record<string, string> {
  return guessMappingFromAliases(headers, genericAdapter.headerAliases);
}

export interface MappedContact {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  source: string;
}

export interface MappedLead {
  title: string;
  value: string;
}

export interface MappedRow {
  contact: MappedContact;
  lead: MappedLead;
  property: Record<string, string>;
}

const CONTACT_KEYS = new Set(["firstName", "lastName", "email", "phone", "company", "source"]);
const LEAD_KEYS = new Set(["title", "value"]);

export function applyMapping(
  row: CsvRow,
  mapping: Record<string, string>,
): MappedRow {
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

  const contact: MappedContact = {
    firstName: values.firstName ?? "",
    lastName: values.lastName ?? "",
    email: values.email ?? "",
    phone: values.phone ?? "",
    company: values.company ?? "",
    source: values.source ?? "",
  };

  const lead: MappedLead = {
    title: values.title ?? "",
    value: values.value ?? "",
  };

  const property: Record<string, string> = {};
  for (const key of Object.keys(values)) {
    if (
      key !== "fullName" &&
      !CONTACT_KEYS.has(key) &&
      !LEAD_KEYS.has(key)
    ) {
      property[key] = values[key];
    }
  }

  return { contact, lead, property };
}
