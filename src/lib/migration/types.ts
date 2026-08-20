export type SourceCrmId =
  | "generic"
  | "carrot"
  | "hubspot"
  | "gohighlevel"
  | "pipedrive"
  | "follow_up_boss";

export type ImportJobStatus = "pending" | "processing" | "completed" | "failed";

export type ImportJobRowStatus = "pending" | "imported" | "failed";

export interface CanonicalImportRecord {
  contact: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    company: string;
    source: string;
  };
  lead: {
    title: string;
    value: string;
    pipelineStageName: string;
    tags: string[];
    notes: string;
  };
  property: Record<string, string>;
}

export interface SourceAdapter {
  id: SourceCrmId;
  label: string;
  headerAliases: Record<string, string[]>;
  detectScore(headers: string[]): number;
  mapRow(
    row: Record<string, string>,
    mapping: Record<string, string>,
  ): CanonicalImportRecord;
}

export interface MigrationPreview {
  sourceCrm: SourceCrmId;
  sourceLabel: string;
  headers: string[];
  sampleRows: Record<string, string>[];
  suggestedMapping: Record<string, string>;
  stageNames: string[];
  recordCount: number;
}

export interface ImportJobProgress {
  id: string;
  sourceCrm: SourceCrmId;
  status: ImportJobStatus;
  importedCount: number;
  failedCount: number;
  pendingCount: number;
  totalCount: number;
  errors: string[];
  errorSummary: string | null;
}
