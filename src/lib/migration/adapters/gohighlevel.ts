import { createSourceAdapter } from "@/lib/migration/adapters/create-adapter";
import { GENERIC_HEADER_ALIASES } from "@/lib/migration/adapters/generic";

export const goHighLevelAdapter = createSourceAdapter({
  id: "gohighlevel",
  label: "GoHighLevel",
  headerAliases: {
    ...GENERIC_HEADER_ALIASES,
    company: [...GENERIC_HEADER_ALIASES.company, "companyname", "company_name"],
    title: [...GENERIC_HEADER_ALIASES.title, "opportunity_name"],
    value: [...GENERIC_HEADER_ALIASES.value, "monetaryvalue", "monetary_value"],
    pipelineStageName: [
      ...GENERIC_HEADER_ALIASES.pipelineStageName,
      "pipelinestage",
      "pipeline_stage_id",
    ],
    addressLine1: [
      ...GENERIC_HEADER_ALIASES.addressLine1,
      "address1",
      "address_1",
    ],
    postalCode: [
      ...GENERIC_HEADER_ALIASES.postalCode,
      "postalcode",
      "postal_code",
    ],
  },
});
