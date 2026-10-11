import type { SupabaseClient } from "@supabase/supabase-js";
import { IMPORT_BATCH_SIZE } from "@/lib/migration/constants";
import type { CanonicalImportRecord, ImportJobProgress, SourceCrmId } from "@/lib/migration/types";
import { canonicalImportRecordSchema } from "@/lib/validations/migration";
import { writeCanonicalRecord } from "@/lib/migration/writer";
import type { Database, Json, Tables } from "@/lib/supabase/types";

type CRMClient = SupabaseClient<Database>;

function asSourceCrm(value: string): SourceCrmId {
  if (
    value === "generic" ||
    value === "carrot" ||
    value === "hubspot" ||
    value === "gohighlevel" ||
    value === "pipedrive" ||
    value === "follow_up_boss"
  ) {
    return value;
  }
  return "generic";
}

export function parseCanonicalPayload(payload: Json): CanonicalImportRecord {
  return canonicalImportRecordSchema.parse(payload);
}

export async function loadImportJobProgress(
  supabase: CRMClient,
  jobId: string,
  accountId?: string,
): Promise<ImportJobProgress> {
  let jobQuery = supabase.from("import_jobs").select("*").eq("id", jobId);
  if (accountId) {
    jobQuery = jobQuery.eq("account_id", accountId);
  }

  const { data: job, error: jobError } = await jobQuery.maybeSingle();
  if (jobError || !job) {
    throw new Error(jobError?.message ?? "Import job not found");
  }

  const { data: rows, error: rowsError } = await supabase
    .from("import_job_rows")
    .select("status, error_text, row_number")
    .eq("job_id", jobId)
    .order("row_number");

  if (rowsError) {
    throw new Error(rowsError.message);
  }

  const allRows = rows ?? [];
  const errors = allRows
    .filter((row) => row.status === "failed" && row.error_text)
    .slice(0, 20)
    .map((row) => `Row ${row.row_number}: ${row.error_text}`);

  return {
    id: job.id,
    sourceCrm: asSourceCrm(job.source_crm),
    status: job.status as ImportJobProgress["status"],
    importedCount: job.imported_count,
    failedCount: job.failed_count,
    pendingCount: allRows.filter((row) => row.status === "pending").length,
    totalCount: allRows.length,
    errors,
    errorSummary: job.error_summary,
  };
}

export async function processImportJob(
  supabase: CRMClient,
  jobId: string,
  options?: { actorUserId?: string | null; accountId?: string; maxDurationMs?: number },
): Promise<ImportJobProgress> {
  const startTime = Date.now();
  const maxDuration = options?.maxDurationMs ?? 30_000;

  let jobQuery = supabase.from("import_jobs").select("*").eq("id", jobId);
  if (options?.accountId) {
    jobQuery = jobQuery.eq("account_id", options.accountId);
  }

  const { data: job, error: jobError } = await jobQuery.maybeSingle();
  if (jobError || !job) {
    throw new Error(jobError?.message ?? "Import job not found");
  }

  if (job.status === "completed" || job.status === "failed" || job.status === "cancelled") {
    return loadImportJobProgress(supabase, jobId, options?.accountId);
  }

  const { error: claimError } = await supabase
    .from("import_jobs")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", jobId)
    .in("status", ["pending", "processing"]);

  if (claimError) {
    throw new Error(claimError.message);
  }

  const stageMap = (job.stage_map ?? {}) as Record<string, string>;
  let imported = job.imported_count;
  let failed = job.failed_count;
  const allErrors: string[] = [];

  while (Date.now() - startTime < maxDuration) {
    const { data: pendingRows, error: pendingError } = await supabase.rpc(
      "claim_import_job_rows",
      {
        p_job_id: jobId,
        p_limit: IMPORT_BATCH_SIZE,
      }
    );

    if (pendingError) {
      throw new Error(pendingError.message);
    }

    if (!pendingRows || pendingRows.length === 0) {
      break;
    }

    for (const row of pendingRows) {
      try {
        const record = parseCanonicalPayload(row.payload);
        await writeCanonicalRecord(supabase, {
          accountId: job.account_id,
          actorUserId: options?.actorUserId ?? job.created_by_user_id,
          record,
          stageMap,
        });
        const { error } = await supabase
          .from("import_job_rows")
          .update({ status: "imported", error_text: null })
          .eq("id", row.id);
        if (error) {
          throw new Error(error.message);
        }
        imported += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to import";
        failed += 1;
        allErrors.push(`Row ${row.row_number}: ${message}`);
        await supabase
          .from("import_job_rows")
          .update({ status: "failed", error_text: message })
          .eq("id", row.id);
      }
    }
  }

  const { count: remaining } = await supabase
    .from("import_job_rows")
    .select("id", { count: "exact", head: true })
    .eq("job_id", jobId)
    .eq("status", "pending");

  const errorSummary = [...allErrors, job.error_summary]
    .filter(Boolean)
    .slice(0, 20)
    .join("\n") || null;

  const nextStatus = remaining && remaining > 0 ? "processing" : "completed";

  await supabase
    .from("import_jobs")
    .update({
      imported_count: imported,
      failed_count: failed,
      error_summary: errorSummary,
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  return loadImportJobProgress(supabase, jobId, options?.accountId);
}

export async function processPendingImportJobs(
  supabase: CRMClient,
  limit = 5,
  maxDurationMs = 540_000,
): Promise<{ jobs: number; imported: number; failed: number }> {
  const { data: jobs, error } = await supabase
    .from("import_jobs")
    .select("id")
    .in("status", ["pending", "processing"])
    .order("created_at")
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  let imported = 0;
  let failed = 0;

  for (const job of jobs ?? []) {
    const progress = await processImportJob(supabase, job.id, {
      maxDurationMs,
    });
    imported += progress.importedCount;
    failed += progress.failedCount;
  }

  return { jobs: jobs?.length ?? 0, imported, failed };
}

export type ImportJobRow = Tables<"import_job_rows">;
