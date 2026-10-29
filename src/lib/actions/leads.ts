"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId, requireUserId } from "@/lib/supabase/account";
import { requireBillingCapability } from "@/lib/billing/access";
import { runTriggeredWorkflows } from "@/lib/workflows/engine";
import { requireRows } from "@/lib/supabase/require-rows";
import { createLeadRecord } from "@/lib/leads/create-lead";
import { createImportDedupeSession } from "@/lib/migration/dedupe";
import { countImportDuplicates } from "@/lib/migration/match-existing";
import { writeCanonicalRecord } from "@/lib/migration/writer";
import {
  addLeadNoteSchema,
  importLeadsCsvMappedSchema,
  leadPropertySchema,
  newLeadSchema,
  previewCsvMappingSchema,
  type AddLeadNoteInput,
  type ImportLeadsCsvMappedInput,
  type LeadPropertyFormInput,
  type NewLeadFormInput,
  type PreviewCsvMappingInput,
} from "@/lib/validations/lead";
import {
  applyMapping,
  guessMapping,
  mappedRowToCanonical,
  parseCsv,
} from "@/lib/leads/csv-import";

export interface ImportLeadsCsvResult {
  imported: number;
  failed: number;
  duplicateCount: number;
  errors: string[];
}

export interface CsvMappingPreview {
  headers: string[];
  sampleRows: Record<string, string>[];
  suggestedMapping: Record<string, string>;
  duplicateCount: number;
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

export async function createLead(
  input: NewLeadFormInput,
): Promise<{ leadId: string }> {
  const data = newLeadSchema.parse(input);
  const accountId = await requireAccountId();
  await requireBillingCapability(accountId, "pipeline");
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

export async function previewCsvMapping(
  input: PreviewCsvMappingInput,
): Promise<CsvMappingPreview> {
  // Server actions are POST-able by anyone who can read an action id, so this
  // needs its own gate even though it touches no tenant data.
  const accountId = await requireAccountId();
  const data = previewCsvMappingSchema.parse(input);
  const { headers, rows } = parseCsv(data.csvText);
  const suggestedMapping = guessMapping(headers);
  const supabase = await createClient();
  const duplicateCount = await countImportDuplicates(
    supabase,
    accountId,
    rows.map((row) =>
      mappedRowToCanonical(applyMapping(row, suggestedMapping), "CSV import"),
    ),
  );

  return {
    headers,
    sampleRows: rows.slice(0, 3),
    suggestedMapping,
    duplicateCount,
  };
}

export async function importLeadsCsvMapped(
  input: ImportLeadsCsvMappedInput,
): Promise<ImportLeadsCsvResult> {
  const data = importLeadsCsvMappedSchema.parse(input);
  const accountId = await requireAccountId();
  await requireBillingCapability(accountId, "pipeline");
  const userId = await requireUserId();
  const supabase = await createClient();
  const { rows } = parseCsv(data.csvText);

  if (rows.length > 500) {
    throw new Error("Import up to 500 leads at a time");
  }

  const result: ImportLeadsCsvResult = {
    imported: 0,
    failed: 0,
    duplicateCount: 0,
    errors: [],
  };
  const session = createImportDedupeSession();

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2;
    const mapped = applyMapping(row, data.mapping);

    if (!mapped.contact.firstName) {
      result.failed += 1;
      result.errors.push(`Row ${rowNumber}: a name column is required`);
      continue;
    }

    try {
      const written = await writeCanonicalRecord(supabase, {
        accountId,
        actorUserId: userId,
        record: mappedRowToCanonical(
          mapped,
          data.fallbackSource || "CSV import",
        ),
        stageMap: {},
        pipelineStageId: data.pipelineStageId || null,
        session,
      });

      if (written.action === "create") {
        await runTriggeredWorkflows(supabase, accountId, "lead_created", {
          leadId: written.leadId,
        });
        result.imported += 1;
      } else {
        result.duplicateCount += 1;
      }
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
  await requireBillingCapability(accountId, "pipeline");
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
        condition: optionalText(data.condition),
        updates_done: optionalText(data.updatesDone),
        updates_needed: optionalText(data.updatesNeeded),
        occupancy_status: optionalText(data.occupancyStatus),
        tenant_duration_rent: optionalText(data.tenantDurationRent),
        motivation: optionalText(data.motivation),
        timeline: optionalText(data.timeline),
        work_needed: optionalText(data.workNeeded),
        roof_condition: optionalText(data.roofCondition),
        flooring_condition: optionalText(data.flooringCondition),
        kitchen_bath_condition: optionalText(data.kitchenBathCondition),
        mortgage: optionalText(data.mortgage),
        frame_siding_condition: optionalText(data.frameSidingCondition),
        windows_condition: optionalText(data.windowsCondition),
        basement_type: optionalText(data.basementType),
        walls_condition: optionalText(data.wallsCondition),
        electrical_plumbing_condition: optionalText(
          data.electricalPlumbingCondition,
        ),
        furnace_condition: optionalText(data.furnaceCondition),
        water_heater_condition: optionalText(data.waterHeaterCondition),
        ac_condition: optionalText(data.acCondition),
        follow_up_contact: optionalText(data.followUpContact),
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
  await requireBillingCapability(accountId, "pipeline");
  const userId = await requireUserId();
  const supabase = await createClient();

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("pipeline_stage_id, pipeline_stages:pipeline_stage_id(name)")
    .eq("id", leadId)
    .eq("account_id", accountId)
    .maybeSingle();

  if (leadError || !lead) {
    throw new Error(leadError?.message ?? "Lead not found");
  }

  const { data: newStage, error: stageError } = await supabase
    .from("pipeline_stages")
    .select("name, is_won, is_lost")
    .eq("id", newStageId)
    .eq("account_id", accountId)
    .maybeSingle();

  if (stageError || !newStage) {
    throw new Error(stageError?.message ?? "Stage not found");
  }

  const status = newStage.is_won ? "won" : newStage.is_lost ? "lost" : "open";

  const { data: updated, error: updateError } = await supabase
    .from("leads")
    .update({ pipeline_stage_id: newStageId, status })
    .eq("id", leadId)
    .eq("account_id", accountId)
    .select("id");
  requireRows(updated, updateError, "Lead not found");

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
  await requireBillingCapability(accountId, "pipeline");
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
