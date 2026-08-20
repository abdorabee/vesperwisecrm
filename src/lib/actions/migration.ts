"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdminAccountId, requireUserId } from "@/lib/supabase/account";
import { requireBillingCapability } from "@/lib/billing/access";
import { getSourceAdapter } from "@/lib/migration/adapters/registry";
import { MAX_MIGRATION_ROWS } from "@/lib/migration/constants";
import {
  buildRecordsFromCsv,
  previewMigrationCsv,
} from "@/lib/migration/orchestrator";
import {
  loadImportJobProgress,
  processImportJob,
} from "@/lib/migration/process-job";
import type { ImportJobProgress, MigrationPreview } from "@/lib/migration/types";
import {
  getImportJobSchema,
  previewMigrationSchema,
  startMigrationJobSchema,
  type GetImportJobInput,
  type PreviewMigrationInput,
  type StartMigrationJobInput,
} from "@/lib/validations/migration";
import type { Json } from "@/lib/supabase/types";

export async function previewMigration(
  input: PreviewMigrationInput,
): Promise<MigrationPreview> {
  await requireAdminAccountId();
  const data = previewMigrationSchema.parse(input);
  return previewMigrationCsv(data.csvText, data.sourceCrm);
}

export async function startMigrationJob(
  input: StartMigrationJobInput,
): Promise<ImportJobProgress> {
  const data = startMigrationJobSchema.parse(input);
  const accountId = await requireAdminAccountId();
  await requireBillingCapability(accountId, "pipeline");
  const userId = await requireUserId();
  const supabase = await createClient();

  const records = buildRecordsFromCsv(
    data.csvText,
    data.mapping,
    data.sourceCrm,
  );

  if (records.length > MAX_MIGRATION_ROWS) {
    throw new Error(`Import up to ${MAX_MIGRATION_ROWS} leads at a time`);
  }

  const adapter = getSourceAdapter(data.sourceCrm);

  const { data: job, error: jobError } = await supabase
    .from("import_jobs")
    .insert({
      account_id: accountId,
      created_by_user_id: userId,
      source_crm: adapter.id,
      status: "pending",
      mapping: data.mapping as Json,
      stage_map: data.stageMap as Json,
    })
    .select("id")
    .single();

  if (jobError || !job) {
    throw new Error(jobError?.message ?? "Failed to create import job");
  }

  const rowInserts = records.map((record, index) => ({
    account_id: accountId,
    job_id: job.id,
    row_number: index + 2,
    payload: record as unknown as Json,
    status: "pending" as const,
  }));

  for (let index = 0; index < rowInserts.length; index += 500) {
    const chunk = rowInserts.slice(index, index + 500);
    const { error: rowsError } = await supabase
      .from("import_job_rows")
      .insert(chunk);
    if (rowsError) {
      throw new Error(rowsError.message);
    }
  }

  const progress = await processImportJob(supabase, job.id, {
    actorUserId: userId,
    accountId,
  });

  revalidatePath("/pipeline");
  revalidatePath("/settings/data-migration");
  return progress;
}

export async function getImportJob(
  input: GetImportJobInput,
): Promise<ImportJobProgress> {
  const data = getImportJobSchema.parse(input);
  const accountId = await requireAdminAccountId();
  const supabase = await createClient();
  const progress = await loadImportJobProgress(supabase, data.jobId, accountId);

  if (
    progress.status === "pending" ||
    progress.status === "processing"
  ) {
    const next = await processImportJob(supabase, data.jobId, {
      accountId,
    });
    if (next.status === "completed") {
      revalidatePath("/pipeline");
    }
    return next;
  }

  return progress;
}
