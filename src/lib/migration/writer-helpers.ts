import type { CanonicalImportRecord } from "@/lib/migration/types";

export function optionalNumber(
  value: string | number | null | undefined,
): number | null {
  if (value == null || value === "") {
    return null;
  }

  const parsed = Number(String(value).replace(/[$,]/g, ""));
  return Number.isNaN(parsed) ? null : parsed;
}

export function normalizeContractStatus(
  value: string | null | undefined,
): string {
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

export function resolveStageId(
  stageName: string,
  stageMap: Record<string, string>,
): string | null {
  const trimmed = stageName.trim();
  if (!trimmed) {
    return null;
  }
  return stageMap[trimmed] || stageMap[trimmed.toLowerCase()] || null;
}

export function propertyInputFromCanonical(
  property: CanonicalImportRecord["property"],
): {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  propertyType?: string;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFeet: number | null;
  askingPrice: number | null;
  estimatedValue: number | null;
  contractStatus: string;
  contractAmount: number | null;
  contractCloseDate?: string;
  notes?: string;
  condition?: string;
  updatesDone?: string;
  updatesNeeded?: string;
  occupancyStatus?: string;
  tenantDurationRent?: string;
  motivation?: string;
  timeline?: string;
  workNeeded?: string;
  roofCondition?: string;
  flooringCondition?: string;
  kitchenBathCondition?: string;
  mortgage?: string;
  frameSidingCondition?: string;
  windowsCondition?: string;
  basementType?: string;
  wallsCondition?: string;
  electricalPlumbingCondition?: string;
  furnaceCondition?: string;
  waterHeaterCondition?: string;
  acCondition?: string;
  followUpContact?: string;
} {
  return {
    addressLine1: property.addressLine1,
    addressLine2: property.addressLine2,
    city: property.city,
    state: property.state,
    postalCode: property.postalCode,
    propertyType: property.propertyType,
    bedrooms: optionalNumber(property.bedrooms),
    bathrooms: optionalNumber(property.bathrooms),
    squareFeet: optionalNumber(property.squareFeet),
    askingPrice: optionalNumber(property.askingPrice),
    estimatedValue: optionalNumber(property.estimatedValue),
    contractStatus: normalizeContractStatus(property.contractStatus),
    contractAmount: optionalNumber(property.contractAmount),
    contractCloseDate: property.contractCloseDate,
    notes: property.notes,
    condition: property.condition,
    updatesDone: property.updatesDone,
    updatesNeeded: property.updatesNeeded,
    occupancyStatus: property.occupancyStatus,
    tenantDurationRent: property.tenantDurationRent,
    motivation: property.motivation,
    timeline: property.timeline,
    workNeeded: property.workNeeded,
    roofCondition: property.roofCondition,
    flooringCondition: property.flooringCondition,
    kitchenBathCondition: property.kitchenBathCondition,
    mortgage: property.mortgage,
    frameSidingCondition: property.frameSidingCondition,
    windowsCondition: property.windowsCondition,
    basementType: property.basementType,
    wallsCondition: property.wallsCondition,
    electricalPlumbingCondition: property.electricalPlumbingCondition,
    furnaceCondition: property.furnaceCondition,
    waterHeaterCondition: property.waterHeaterCondition,
    acCondition: property.acCondition,
    followUpContact: property.followUpContact,
  };
}
