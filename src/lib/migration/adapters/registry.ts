import { carrotAdapter } from "@/lib/migration/adapters/carrot";
import { followUpBossAdapter } from "@/lib/migration/adapters/follow-up-boss";
import { genericAdapter } from "@/lib/migration/adapters/generic";
import { goHighLevelAdapter } from "@/lib/migration/adapters/gohighlevel";
import { hubspotAdapter } from "@/lib/migration/adapters/hubspot";
import { pipedriveAdapter } from "@/lib/migration/adapters/pipedrive";
import type { SourceAdapter, SourceCrmId } from "@/lib/migration/types";

export const SOURCE_ADAPTERS: SourceAdapter[] = [
  carrotAdapter,
  hubspotAdapter,
  goHighLevelAdapter,
  pipedriveAdapter,
  followUpBossAdapter,
  genericAdapter,
];

export const SOURCE_CRM_OPTIONS: {
  id: SourceCrmId;
  label: string;
  description: string;
}[] = [
  {
    id: "carrot",
    label: "Carrot CRM",
    description: "Opportunity export with seller, property, and campaign columns",
  },
  {
    id: "hubspot",
    label: "HubSpot",
    description: "Contacts or deals CSV from HubSpot export",
  },
  {
    id: "gohighlevel",
    label: "GoHighLevel",
    description: "Contacts or opportunities CSV from a location export",
  },
  {
    id: "pipedrive",
    label: "Pipedrive",
    description: "People or deals CSV from the Export data tab",
  },
  {
    id: "follow_up_boss",
    label: "Follow Up Boss",
    description: "People CSV with optional deal price and stage columns",
  },
  {
    id: "generic",
    label: "Generic CSV",
    description: "Any spreadsheet. You will map columns to VesperWise fields",
  },
];

export function getSourceAdapter(id: SourceCrmId): SourceAdapter {
  const adapter = SOURCE_ADAPTERS.find((candidate) => candidate.id === id);
  if (!adapter) {
    return genericAdapter;
  }
  return adapter;
}
