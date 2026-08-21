import { suggestMapping } from "@/lib/migration/adapters/create-adapter";
import { getSourceAdapter } from "@/lib/migration/adapters/registry";
import { detectSourceCrm } from "@/lib/migration/detect-source";
import { parseCsv } from "@/lib/leads/csv-import";
import type {
  CanonicalImportRecord,
  MigrationPreview,
  SourceAdapter,
  SourceCrmId,
} from "@/lib/migration/types";

export function previewMigrationCsv(
  csvText: string,
  preferredSource?: SourceCrmId | null,
): MigrationPreview {
  const { headers, rows } = parseCsv(csvText);
  const adapter = detectSourceCrm(headers, preferredSource);
  const suggestedMapping = suggestMapping(adapter, headers);
  const records = buildRecords(rows, suggestedMapping, adapter);
  const stageNames = [
    ...new Set(
      records
        .map((record) => record.lead.pipelineStageName.trim())
        .filter(Boolean),
    ),
  ];

  return {
    sourceCrm: adapter.id,
    sourceLabel: adapter.label,
    headers,
    sampleRows: rows.slice(0, 3),
    suggestedMapping,
    stageNames,
    recordCount: rows.length,
  };
}

export function buildRecords(
  rows: Record<string, string>[],
  mapping: Record<string, string>,
  adapter: SourceAdapter,
): CanonicalImportRecord[] {
  return rows.map((row) => adapter.mapRow(row, mapping));
}

export function buildRecordsFromCsv(
  csvText: string,
  mapping: Record<string, string>,
  sourceCrm: SourceCrmId,
): CanonicalImportRecord[] {
  const { rows } = parseCsv(csvText);
  return buildRecords(rows, mapping, getSourceAdapter(sourceCrm));
}
