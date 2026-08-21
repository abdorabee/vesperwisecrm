import { createSourceAdapter } from "@/lib/migration/adapters/create-adapter";
import { GENERIC_HEADER_ALIASES } from "@/lib/migration/adapters/generic";

export const pipedriveAdapter = createSourceAdapter({
  id: "pipedrive",
  label: "Pipedrive",
  headerAliases: {
    ...GENERIC_HEADER_ALIASES,
    fullName: [...GENERIC_HEADER_ALIASES.fullName, "person_name"],
    email: [...GENERIC_HEADER_ALIASES.email, "emails"],
    phone: [...GENERIC_HEADER_ALIASES.phone, "phones"],
    company: [
      ...GENERIC_HEADER_ALIASES.company,
      "org_name",
      "organization",
      "org",
    ],
    title: [...GENERIC_HEADER_ALIASES.title, "deal_title"],
    pipelineStageName: [
      ...GENERIC_HEADER_ALIASES.pipelineStageName,
      "stage_id",
      "stage_name",
    ],
  },
});
