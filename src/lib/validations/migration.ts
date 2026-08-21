import { z } from "zod";
import { MAX_CSV_BYTES, MAX_MIGRATION_ROWS } from "@/lib/migration/constants";

export const sourceCrmIdSchema = z.enum([
  "generic",
  "carrot",
  "hubspot",
  "gohighlevel",
  "pipedrive",
  "follow_up_boss",
]);

export const canonicalImportRecordSchema = z.object({
  contact: z.object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    phone: z.string(),
    company: z.string(),
    source: z.string(),
  }),
  lead: z.object({
    title: z.string(),
    value: z.string(),
    pipelineStageName: z.string(),
    tags: z.array(z.string()),
    notes: z.string(),
  }),
  property: z.record(z.string(), z.string()),
});

export const previewMigrationSchema = z.object({
  csvText: z
    .string()
    .min(1, "CSV content is required")
    .max(MAX_CSV_BYTES, "CSV content is too large (limit 5 MB)"),
  sourceCrm: sourceCrmIdSchema.optional().nullable(),
});

export const startMigrationJobSchema = z.object({
  csvText: z
    .string()
    .min(1, "CSV content is required")
    .max(MAX_CSV_BYTES, "CSV content is too large (limit 5 MB)"),
  sourceCrm: sourceCrmIdSchema,
  mapping: z.record(z.string(), z.string()),
  stageMap: z.record(z.string(), z.string()).optional().default({}),
});

export const getImportJobSchema = z.object({
  jobId: z.string().uuid(),
});

export type PreviewMigrationInput = z.infer<typeof previewMigrationSchema>;
export type StartMigrationJobInput = z.infer<typeof startMigrationJobSchema>;
export type GetImportJobInput = z.infer<typeof getImportJobSchema>;

export { MAX_MIGRATION_ROWS };
