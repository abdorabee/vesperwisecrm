"use client";

import { ChangeEvent, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SOURCE_CRM_OPTIONS } from "@/lib/migration/adapters/registry";
import { MIGRATION_FIELD_GROUPS } from "@/lib/migration/fields";
import {
  getImportJob,
  previewMigration,
  startMigrationJob,
} from "@/lib/actions/migration";
import type {
  ImportJobProgress,
  MigrationPreview,
  SourceCrmId,
} from "@/lib/migration/types";
import type { Tables } from "@/lib/supabase/types";

interface MigrationWizardProps {
  stages: Tables<"pipeline_stages">[];
}

const SKIP = "__skip__";
const UNMAPPED_STAGE = "__default__";

const FIELD_LABELS = Object.fromEntries(
  MIGRATION_FIELD_GROUPS.flatMap((group) => group.fields).map((field) => [
    field.key,
    field.label,
  ]),
);

export function MigrationWizard({ stages }: MigrationWizardProps) {
  const [step, setStep] = useState<"source" | "upload" | "map" | "progress">(
    "source",
  );
  const [sourceCrm, setSourceCrm] = useState<SourceCrmId>("carrot");
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<MigrationPreview | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [stageMap, setStageMap] = useState<Record<string, string>>({});
  const [job, setJob] = useState<ImportJobProgress | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  useEffect(() => {
    if (!job || (job.status !== "pending" && job.status !== "processing")) {
      return;
    }

    const timer = window.setInterval(async () => {
      try {
        const next = await getImportJob({ jobId: job.id });
        setJob(next);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to refresh import",
        );
      }
    }, 2000);

    return () => window.clearInterval(timer);
  }, [job]);

  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setCsvText(await file.text());
  }

  async function goToMapping() {
    setIsWorking(true);
    try {
      const result = await previewMigration({ csvText, sourceCrm });
      setPreview(result);
      setMapping(result.suggestedMapping);
      setStageMap(
        Object.fromEntries(result.stageNames.map((name) => [name, ""])),
      );
      setStep("map");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to read CSV");
    } finally {
      setIsWorking(false);
    }
  }

  async function startImport() {
    if (!preview) {
      return;
    }
    setIsWorking(true);
    try {
      const cleanedStageMap = Object.fromEntries(
        Object.entries(stageMap).filter(([, stageId]) => Boolean(stageId)),
      );
      const progress = await startMigrationJob({
        csvText,
        sourceCrm,
        mapping,
        stageMap: cleanedStageMap,
      });
      setJob(progress);
      setStep("progress");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to start import",
      );
    } finally {
      setIsWorking(false);
    }
  }

  function reset() {
    setStep("source");
    setCsvText("");
    setPreview(null);
    setMapping({});
    setStageMap({});
    setJob(null);
  }

  if (step === "source") {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {SOURCE_CRM_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setSourceCrm(option.id)}
              className={`rounded-lg border p-4 text-left ${
                sourceCrm === option.id
                  ? "border-brand-strong ring-1 ring-brand-strong"
                  : "border-border"
              }`}
            >
              <p className="text-sm font-medium">{option.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {option.description}
              </p>
            </button>
          ))}
        </div>
        <Button onClick={() => setStep("upload")}>Continue</Button>
      </div>
    );
  }

  if (step === "upload") {
    return (
      <div className="space-y-4">
        <Field>
          <FieldLabel htmlFor="migration-csv">CSV file</FieldLabel>
          <Input
            id="migration-csv"
            type="file"
            accept=".csv,text/csv"
            onChange={readFile}
          />
          <FieldDescription>
            Export from {SOURCE_CRM_OPTIONS.find((item) => item.id === sourceCrm)?.label}.
            Up to 5,000 rows and 5 MB.
          </FieldDescription>
        </Field>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setStep("source")}>
            Back
          </Button>
          <Button onClick={goToMapping} disabled={isWorking || !csvText.trim()}>
            {isWorking ? "Reading..." : "Next: map columns"}
          </Button>
        </div>
      </div>
    );
  }

  if (step === "map" && preview) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Detected {preview.sourceLabel}. {preview.recordCount} rows ready to import.
        </p>
        {preview.stageNames.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">Pipeline stages</p>
            {preview.stageNames.map((name) => (
              <Field key={name}>
                <FieldLabel>{name}</FieldLabel>
                <Select
                  value={stageMap[name] || UNMAPPED_STAGE}
                  onValueChange={(value) =>
                    value &&
                    setStageMap((prev) => ({
                      ...prev,
                      [name]: value === UNMAPPED_STAGE ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(value: string) =>
                        value === UNMAPPED_STAGE
                          ? "First pipeline stage"
                          : (stages.find((stage) => stage.id === value)?.name ??
                            "Stage")
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNMAPPED_STAGE}>
                      First pipeline stage
                    </SelectItem>
                    {stages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ))}
          </div>
        )}
        <div className="max-h-80 overflow-y-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Your column</TableHead>
                <TableHead>Sample</TableHead>
                <TableHead>Maps to</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.headers.map((header) => (
                <TableRow key={header}>
                  <TableCell className="font-medium">{header}</TableCell>
                  <TableCell className="max-w-32 truncate text-xs text-muted-foreground">
                    {preview.sampleRows[0]?.[header] || "—"}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={mapping[header] || SKIP}
                      onValueChange={(value) =>
                        value &&
                        setMapping((prev) => ({
                          ...prev,
                          [header]: value === SKIP ? "" : value,
                        }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue>
                          {(value: string) =>
                            value === SKIP
                              ? "Skip"
                              : (FIELD_LABELS[value] ?? "Skip")
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={SKIP}>Skip</SelectItem>
                        {MIGRATION_FIELD_GROUPS.map((group) => (
                          <SelectGroup key={group.label}>
                            <SelectLabel>{group.label}</SelectLabel>
                            {group.fields.map((field) => (
                              <SelectItem key={field.key} value={field.key}>
                                {field.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setStep("upload")} disabled={isWorking}>
            Back
          </Button>
          <Button onClick={startImport} disabled={isWorking}>
            {isWorking ? "Starting..." : "Start import"}
          </Button>
        </div>
      </div>
    );
  }

  if (step === "progress" && job) {
    const done = job.status === "completed" || job.status === "failed";
    return (
      <div className="space-y-4">
        <p className="text-sm">
          {done
            ? `Imported ${job.importedCount} of ${job.totalCount} rows.`
            : `Importing ${job.importedCount + job.failedCount} of ${job.totalCount} rows...`}
          {job.failedCount > 0 ? ` ${job.failedCount} failed.` : ""}
        </p>
        {job.errors.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
            {job.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <Button render={<Link href="/pipeline" />} nativeButton={false}>
            Open pipeline
          </Button>
          <Button variant="outline" onClick={reset}>
            Import another file
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
