import { createSourceAdapter } from "@/lib/migration/adapters/create-adapter";
import { GENERIC_HEADER_ALIASES } from "@/lib/migration/adapters/generic";

export const hubspotAdapter = createSourceAdapter({
  id: "hubspot",
  label: "HubSpot",
  headerAliases: {
    ...GENERIC_HEADER_ALIASES,
    firstName: [...GENERIC_HEADER_ALIASES.firstName, "firstname"],
    lastName: [...GENERIC_HEADER_ALIASES.lastName, "lastname"],
    phone: [...GENERIC_HEADER_ALIASES.phone, "mobilephone"],
    title: [...GENERIC_HEADER_ALIASES.title, "dealname", "deal_name"],
    value: [...GENERIC_HEADER_ALIASES.value, "amount"],
    pipelineStageName: [
      ...GENERIC_HEADER_ALIASES.pipelineStageName,
      "dealstage",
      "deal_stage",
    ],
    contractCloseDate: [
      ...GENERIC_HEADER_ALIASES.contractCloseDate,
      "closedate",
      "close_date",
    ],
    postalCode: [...GENERIC_HEADER_ALIASES.postalCode, "zip"],
  },
});
