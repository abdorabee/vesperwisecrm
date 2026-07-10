import type { ExtractedCallNoteFields } from "@/lib/ai/parse-call-notes";
import type { TablesUpdate } from "@/lib/supabase/types";

type PropertyUpdate = TablesUpdate<"lead_properties">;

const TEXT_FIELD_MAP: [keyof ExtractedCallNoteFields, keyof PropertyUpdate][] = [
  ["condition", "condition"],
  ["updatesDone", "updates_done"],
  ["updatesNeeded", "updates_needed"],
  ["occupancyStatus", "occupancy_status"],
  ["tenantDurationRent", "tenant_duration_rent"],
  ["motivation", "motivation"],
  ["timeline", "timeline"],
  ["workNeeded", "work_needed"],
  ["roofCondition", "roof_condition"],
  ["flooringCondition", "flooring_condition"],
  ["kitchenBathCondition", "kitchen_bath_condition"],
  ["mortgage", "mortgage"],
  ["frameSidingCondition", "frame_siding_condition"],
  ["windowsCondition", "windows_condition"],
  ["basementType", "basement_type"],
  ["wallsCondition", "walls_condition"],
  ["electricalPlumbingCondition", "electrical_plumbing_condition"],
  ["furnaceCondition", "furnace_condition"],
  ["waterHeaterCondition", "water_heater_condition"],
  ["acCondition", "ac_condition"],
  ["followUpContact", "follow_up_contact"],
  ["notes", "notes"],
];

const NUMERIC_FIELD_MAP: [keyof ExtractedCallNoteFields, keyof PropertyUpdate][] = [
  ["askingPrice", "asking_price"],
  ["bedrooms", "bedrooms"],
  ["bathrooms", "bathrooms"],
  ["squareFeet", "square_feet"],
];

function parsePositiveNumber(value: string): number | null {
  const numeric = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

// Maps AI-extracted call-note fields onto lead_properties columns. Only
// returns keys with usable values; callers decide merge semantics.
export function extractedFieldsToPropertyUpdate(
  fields: ExtractedCallNoteFields,
): PropertyUpdate {
  const update: Record<string, string | number> = {};

  for (const [source, column] of TEXT_FIELD_MAP) {
    const value = fields[source];
    if (typeof value === "string" && value.trim()) {
      update[column as string] = value.trim();
    }
  }

  for (const [source, column] of NUMERIC_FIELD_MAP) {
    const value = fields[source];
    if (typeof value === "string" && value.trim()) {
      const numeric = parsePositiveNumber(value);
      if (numeric != null) {
        update[column as string] = numeric;
      }
    }
  }

  return update as PropertyUpdate;
}
