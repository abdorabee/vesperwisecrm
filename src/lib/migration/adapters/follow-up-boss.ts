import { createSourceAdapter } from "@/lib/migration/adapters/create-adapter";
import { GENERIC_HEADER_ALIASES } from "@/lib/migration/adapters/generic";

export const followUpBossAdapter = createSourceAdapter({
  id: "follow_up_boss",
  label: "Follow Up Boss",
  headerAliases: {
    ...GENERIC_HEADER_ALIASES,
    email: [
      ...GENERIC_HEADER_ALIASES.email,
      "email_1",
      "emails",
    ],
    phone: [
      ...GENERIC_HEADER_ALIASES.phone,
      "phone_1",
      "phones",
    ],
    addressLine1: [
      ...GENERIC_HEADER_ALIASES.addressLine1,
      "street",
    ],
    postalCode: [
      ...GENERIC_HEADER_ALIASES.postalCode,
      "code",
    ],
    value: [...GENERIC_HEADER_ALIASES.value, "price"],
    pipelineStageName: [
      ...GENERIC_HEADER_ALIASES.pipelineStageName,
      "person_stage",
      "deal_stage",
    ],
    source: [...GENERIC_HEADER_ALIASES.source, "lead_source"],
  },
});
