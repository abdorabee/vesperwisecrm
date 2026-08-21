import { CRM_FIELD_GROUPS } from "@/lib/leads/csv-import";

export const MIGRATION_FIELD_GROUPS: {
  label: string;
  fields: { key: string; label: string }[];
}[] = [
  ...CRM_FIELD_GROUPS,
  {
    label: "Pipeline",
    fields: [
      { key: "pipelineStageName", label: "Pipeline stage" },
      { key: "tags", label: "Tags" },
    ],
  },
];
