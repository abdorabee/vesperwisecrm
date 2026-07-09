// Shared CSV parsing + field-mapping for lead migration. Column names vary
// wildly across exports (Podio, REsimpli, InvestorFuse, Google Sheets), so
// import is mapping-driven rather than assuming a fixed header format --
// guessMapping() just pre-fills the mapping UI with best-effort matches.

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

const FIELD_ALIASES: Record<string, string[]> = {
  fullName: ["name", "full_name", "contact_name", "seller_name", "owner_name"],
  firstName: ["first_name", "firstname", "first"],
  lastName: ["last_name", "lastname", "last"],
  email: ["email", "email_address"],
  phone: ["phone", "phone_number", "mobile", "cell", "primary_phone"],
  company: ["company", "organization"],
  source: ["source", "lead_source"],
  title: ["title", "lead_title", "opportunity"],
  value: ["value", "deal_value", "amount"],
  addressLine1: ["property_address", "address", "address_line1", "street_address"],
  addressLine2: ["address_line2", "unit", "suite"],
  city: ["property_city", "city"],
  state: ["property_state", "state"],
  postalCode: ["property_zip", "property_postal_code", "postal_code", "zip"],
  propertyType: ["property_type", "type"],
  bedrooms: ["bedrooms", "beds"],
  bathrooms: ["bathrooms", "baths"],
  squareFeet: ["square_feet", "sqft", "area", "square_footage"],
  askingPrice: ["asking_price", "list_price"],
  estimatedValue: ["estimated_value", "property_value", "arv"],
  contractStatus: ["contract_status"],
  contractAmount: ["contract_amount", "contract_price"],
  contractCloseDate: ["contract_close_date", "close_date"],
  condition: ["condition", "property_condition", "overall_condition"],
  updatesDone: ["updates_done", "recent_updates"],
  updatesNeeded: ["updates_needed", "repairs_needed"],
  occupancyStatus: ["occupancy", "occupancy_status"],
  tenantDurationRent: ["tenant_duration_rent", "rent", "lease_terms"],
  motivation: ["motivation", "seller_motivation", "reason_for_selling"],
  timeline: ["timeline", "desired_timeline"],
  workNeeded: ["work_needed", "repairs"],
  roofCondition: ["roof", "roof_condition"],
  flooringCondition: ["flooring", "flooring_condition"],
  kitchenBathCondition: ["kitchen_bath", "kitchen_bath_condition"],
  mortgage: ["mortgage", "mortgage_balance", "loan_balance"],
  frameSidingCondition: ["frame_siding", "siding", "frame_siding_condition"],
  windowsCondition: ["windows", "windows_condition"],
  basementType: ["basement", "basement_type"],
  wallsCondition: ["walls", "walls_condition"],
  electricalPlumbingCondition: ["electrical_plumbing", "electrical", "plumbing"],
  furnaceCondition: ["furnace", "furnace_condition", "hvac"],
  waterHeaterCondition: ["water_heater", "water_heater_condition"],
  acCondition: ["ac", "air_conditioning", "ac_condition"],
  followUpContact: ["follow_up_contact", "follow_up", "next_contact"],
  notes: ["notes", "property_notes", "property_note", "general_notes"],
};

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function guessMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};

  for (const header of headers) {
    const normalized = normalizeHeader(header);
    const match = Object.entries(FIELD_ALIASES).find(([, aliases]) =>
      aliases.includes(normalized),
    );
    if (match) {
      mapping[header] = match[0];
    }
  }

  return mapping;
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
