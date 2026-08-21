import { createSourceAdapter } from "@/lib/migration/adapters/create-adapter";
import { GENERIC_HEADER_ALIASES } from "@/lib/migration/adapters/generic";

export const carrotAdapter = createSourceAdapter({
  id: "carrot",
  label: "Carrot CRM",
  headerAliases: {
    ...GENERIC_HEADER_ALIASES,
    firstName: [
      ...GENERIC_HEADER_ALIASES.firstName,
      "seller_first_name",
    ],
    lastName: [...GENERIC_HEADER_ALIASES.lastName, "seller_last_name"],
    email: [...GENERIC_HEADER_ALIASES.email, "seller_email"],
    phone: [...GENERIC_HEADER_ALIASES.phone, "seller_phone"],
    source: [...GENERIC_HEADER_ALIASES.source, "campaign_name", "campaign"],
    pipelineStageName: [
      ...GENERIC_HEADER_ALIASES.pipelineStageName,
      "pipeline",
      "sub_pipeline",
      "opportunity_status",
    ],
    tags: [...GENERIC_HEADER_ALIASES.tags, "label"],
    askingPrice: [
      ...GENERIC_HEADER_ALIASES.askingPrice,
      "price_asking",
    ],
    estimatedValue: [
      ...GENERIC_HEADER_ALIASES.estimatedValue,
      "price_market_value",
    ],
    bedrooms: [...GENERIC_HEADER_ALIASES.bedrooms, "num_bedrooms"],
    bathrooms: [...GENERIC_HEADER_ALIASES.bathrooms, "num_bathrooms"],
    squareFeet: [
      ...GENERIC_HEADER_ALIASES.squareFeet,
      "size_square_feet",
      "size_sqft",
    ],
    occupancyStatus: [
      ...GENERIC_HEADER_ALIASES.occupancyStatus,
      "occupancy",
    ],
    workNeeded: [
      ...GENERIC_HEADER_ALIASES.workNeeded,
      "estimate_repairs_needed",
    ],
    timeline: [...GENERIC_HEADER_ALIASES.timeline, "time_to_sell"],
    mortgage: [...GENERIC_HEADER_ALIASES.mortgage, "price_mortgage"],
    basementType: [
      ...GENERIC_HEADER_ALIASES.basementType,
      "basement_type",
    ],
  },
});
