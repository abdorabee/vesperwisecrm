"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId, requireUserId } from "@/lib/supabase/account";
import { runTriggeredWorkflows } from "@/lib/workflows/engine";
import { createLeadRecord } from "@/lib/leads/create-lead";
import {
  addLeadNoteSchema,
  importLeadsCsvSchema,
  leadPropertySchema,
  newLeadSchema,
  type AddLeadNoteInput,
  type ImportLeadsCsvInput,
  type LeadPropertyFormInput,
  type NewLeadFormInput,
} from "@/lib/validations/lead";

export interface ImportLeadsCsvResult {
  imported: number;
  failed: number;
  errors: string[];
}

type CsvRow = Record<string, string>;

function parseCsvLine(line: string): string[] {
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

function parseCsv(text: string): CsvRow[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("CSV must include a header row and at least one lead row");
  }

  const headers = parseCsvLine(lines[0]).map((header) =>
    header.trim().toLowerCase().replace(/[\s-]+/g, "_"),
  );

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return headers.reduce<CsvRow>((row, header, index) => {
      row[header] = values[index]?.trim() ?? "";
      return row;
    }, {});
  });
}

function firstValue(row: CsvRow, aliases: string[]): string {
  for (const alias of aliases) {
    const value = row[alias];
    if (value) {
      return value;
    }
  }
  return "";
}

function optionalNumber(value: string | number | null | undefined): number | null {
  if (value == null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function optionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeContractStatus(value: string | null | undefined): string {
  const normalized = value?.trim().toLowerCase().replace(/[\s-]+/g, "_");

  if (
    normalized === "offered" ||
    normalized === "under_contract" ||
    normalized === "closed" ||
    normalized === "cancelled"
  ) {
    return normalized;
  }

  return "none";
}

function namesFromRow(row: CsvRow): { firstName: string; lastName: string } {
  const firstName = firstValue(row, ["first_name", "firstname", "first"]);
  const lastName = firstValue(row, ["last_name", "lastname", "last"]);

  if (firstName) {
    return { firstName, lastName };
  }

  const fullName = firstValue(row, ["name", "full_name", "contact_name"]);
  const parts = fullName.split(/\s+/).filter(Boolean);

  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

function titleFromRow(row: CsvRow, firstName: string, lastName: string): string {
  const title = firstValue(row, ["title", "lead_title", "opportunity"]);
  if (title) {
    return title;
  }

  const company = firstValue(row, ["company", "organization"]);
  const contactName = [firstName, lastName].filter(Boolean).join(" ");

  return company || contactName || "Imported lead";
}

export async function createLead(
  input: NewLeadFormInput,
): Promise<{ leadId: string }> {
  const data = newLeadSchema.parse(input);
  const accountId = await requireAccountId();
  const userId = await requireUserId();
  const supabase = await createClient();

  const { leadId } = await createLeadRecord(supabase, {
    accountId,
    actorUserId: userId,
    title: data.title,
    pipelineStageId: data.pipelineStageId,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone,
    company: data.company,
    source: data.source,
    value: data.value ? Number(data.value) : null,
    property: data.property
      ? {
          addressLine1: data.property.addressLine1,
          addressLine2: data.property.addressLine2,
          city: data.property.city,
          state: data.property.state,
          postalCode: data.property.postalCode,
          propertyType: data.property.propertyType,
          bedrooms: optionalNumber(data.property.bedrooms),
          bathrooms: optionalNumber(data.property.bathrooms),
          squareFeet: optionalNumber(data.property.squareFeet),
          askingPrice: optionalNumber(data.property.askingPrice),
          estimatedValue: optionalNumber(data.property.estimatedValue),
          contractStatus: normalizeContractStatus(data.property.contractStatus),
          contractAmount: optionalNumber(data.property.contractAmount),
          contractCloseDate: data.property.contractCloseDate,
          notes: data.property.notes,
        }
      : undefined,
  });

  await runTriggeredWorkflows(supabase, accountId, "lead_created", {
    leadId,
  });

  revalidatePath("/pipeline");

  return { leadId };
}

export async function importLeadsCsv(
  input: ImportLeadsCsvInput,
): Promise<ImportLeadsCsvResult> {
  const data = importLeadsCsvSchema.parse(input);
  const accountId = await requireAccountId();
  const userId = await requireUserId();
  const supabase = await createClient();
  const rows = parseCsv(data.csvText);

  if (rows.length > 500) {
    throw new Error("Import up to 500 leads at a time");
  }

  const result: ImportLeadsCsvResult = {
    imported: 0,
    failed: 0,
    errors: [],
  };

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2;
    const { firstName, lastName } = namesFromRow(row);
    const title = titleFromRow(row, firstName, lastName);
    const value = firstValue(row, ["value", "deal_value", "amount"]);

    if (!firstName) {
      result.failed += 1;
      result.errors.push(`Row ${rowNumber}: first_name or name is required`);
      continue;
    }

    try {
      const { leadId } = await createLeadRecord(supabase, {
        accountId,
        actorUserId: userId,
        title,
        pipelineStageId:
          firstValue(row, ["pipeline_stage_id", "stage_id"]) ||
          data.pipelineStageId ||
          null,
        firstName,
        lastName,
        email: firstValue(row, ["email", "email_address"]),
        phone: firstValue(row, ["phone", "phone_number", "mobile"]),
        company: firstValue(row, ["company", "organization"]),
        source:
          firstValue(row, ["source", "lead_source"]) ||
          data.fallbackSource ||
          "CSV import",
        value: value ? Number(value) : null,
        property: {
          addressLine1: firstValue(row, [
            "property_address",
            "address",
            "address_line1",
            "street_address",
          ]),
          addressLine2: firstValue(row, ["address_line2", "unit", "suite"]),
          city: firstValue(row, ["property_city", "city"]),
          state: firstValue(row, ["property_state", "state"]),
          postalCode: firstValue(row, [
            "property_zip",
            "property_postal_code",
            "postal_code",
            "zip",
          ]),
          propertyType: firstValue(row, ["property_type", "type"]),
          bedrooms: optionalNumber(firstValue(row, ["bedrooms", "beds"])),
          bathrooms: optionalNumber(firstValue(row, ["bathrooms", "baths"])),
          squareFeet: optionalNumber(
            firstValue(row, ["square_feet", "sqft", "area"]),
          ),
          askingPrice: optionalNumber(
            firstValue(row, ["asking_price", "list_price"]),
          ),
          estimatedValue: optionalNumber(
            firstValue(row, ["estimated_value", "property_value", "arv"]),
          ),
          contractStatus: normalizeContractStatus(
            firstValue(row, ["contract_status"]),
          ),
          contractAmount: optionalNumber(
            firstValue(row, ["contract_amount", "contract_price"]),
          ),
          contractCloseDate: firstValue(row, [
            "contract_close_date",
            "close_date",
          ]),
          notes: firstValue(row, ["property_notes", "property_note"]),
        },
      });

      await runTriggeredWorkflows(supabase, accountId, "lead_created", {
        leadId,
      });

      result.imported += 1;
    } catch (error) {
      result.failed += 1;
      result.errors.push(
        `Row ${rowNumber}: ${
          error instanceof Error ? error.message : "Failed to import"
        }`,
      );
    }
  }

  revalidatePath("/pipeline");

  return result;
}

export async function saveLeadProperty(
  leadId: string,
  input: LeadPropertyFormInput,
): Promise<void> {
  const data = leadPropertySchema.parse(input);
  const accountId = await requireAccountId();
  const userId = await requireUserId();
  const supabase = await createClient();

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id")
    .eq("id", leadId)
    .eq("account_id", accountId)
    .is("deleted_at", null)
    .single();

  if (leadError || !lead) {
    throw new Error(leadError?.message ?? "Lead not found");
  }

  const { error: propertyError } = await supabase
    .from("lead_properties")
    .upsert(
      {
        account_id: accountId,
        lead_id: leadId,
        address_line1: optionalText(data.addressLine1),
        address_line2: optionalText(data.addressLine2),
        city: optionalText(data.city),
        state: optionalText(data.state),
        postal_code: optionalText(data.postalCode),
        property_type: optionalText(data.propertyType),
        bedrooms: optionalNumber(data.bedrooms),
        bathrooms: optionalNumber(data.bathrooms),
        square_feet: optionalNumber(data.squareFeet),
        asking_price: optionalNumber(data.askingPrice),
        estimated_value: optionalNumber(data.estimatedValue),
        contract_status: normalizeContractStatus(data.contractStatus),
        contract_amount: optionalNumber(data.contractAmount),
        contract_close_date: optionalText(data.contractCloseDate),
        notes: optionalText(data.notes),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "account_id,lead_id" },
    );

  if (propertyError) {
    throw new Error(propertyError.message);
  }

  await supabase.from("activities").insert({
    account_id: accountId,
    lead_id: leadId,
    type: "note_added",
    actor_user_id: userId,
    payload: {
      note: "Property and contract details updated.",
      system: true,
    },
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/pipeline");
}

export async function updateLeadStage(
  leadId: string,
  newStageId: string,
): Promise<void> {
  const accountId = await requireAccountId();
  const userId = await requireUserId();
  const supabase = await createClient();

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("pipeline_stage_id, pipeline_stages:pipeline_stage_id(name)")
    .eq("id", leadId)
    .single();

  if (leadError || !lead) {
    throw new Error(leadError?.message ?? "Lead not found");
  }

  const { data: newStage, error: stageError } = await supabase
    .from("pipeline_stages")
    .select("name, is_won, is_lost")
    .eq("id", newStageId)
    .single();

  if (stageError || !newStage) {
    throw new Error(stageError?.message ?? "Stage not found");
  }

  const status = newStage.is_won ? "won" : newStage.is_lost ? "lost" : "open";

  const { error: updateError } = await supabase
    .from("leads")
    .update({ pipeline_stage_id: newStageId, status })
    .eq("id", leadId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const fromStageName = Array.isArray(lead.pipeline_stages)
    ? lead.pipeline_stages[0]?.name
    : (lead.pipeline_stages as { name: string } | null)?.name;

  await supabase.from("activities").insert({
    account_id: accountId,
    lead_id: leadId,
    type: "stage_changed",
    actor_user_id: userId,
    payload: { from_stage: fromStageName ?? null, to_stage: newStage.name },
  });

  await runTriggeredWorkflows(supabase, accountId, "stage_changed", {
    leadId,
    toStageId: newStageId,
  });

  revalidatePath("/pipeline");
  revalidatePath(`/leads/${leadId}`);
}

export async function addLeadNote(
  leadId: string,
  input: AddLeadNoteInput,
): Promise<void> {
  const data = addLeadNoteSchema.parse(input);
  const accountId = await requireAccountId();
  const userId = await requireUserId();
  const supabase = await createClient();

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id")
    .eq("id", leadId)
    .eq("account_id", accountId)
    .is("deleted_at", null)
    .single();

  if (leadError || !lead) {
    throw new Error(leadError?.message ?? "Lead not found");
  }

  const { error } = await supabase.from("activities").insert({
    account_id: accountId,
    lead_id: leadId,
    type: "note_added",
    actor_user_id: userId,
    payload: { note: data.note },
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/leads/${leadId}`);
}
