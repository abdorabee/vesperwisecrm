"use client";

import { ChangeEvent, useState } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  importLeadsCsvMapped,
  previewCsvMapping,
  type CsvMappingPreview,
} from "@/lib/actions/leads";
import { CRM_FIELD_GROUPS } from "@/lib/leads/csv-import";
import type { Tables } from "@/lib/supabase/types";

interface ImportLeadsDialogProps {
  stages: Tables<"pipeline_stages">[];
}

const DEFAULT_STAGE = "__default__";
const SKIP = "__skip__";

const FIELD_LABELS = Object.fromEntries(
  CRM_FIELD_GROUPS.flatMap((group) => group.fields).map((field) => [
    field.key,
    field.label,
  ]),
);

export function ImportLeadsDialog({ stages }: ImportLeadsDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"paste" | "map">("paste");
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<CsvMappingPreview | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [pipelineStageId, setPipelineStageId] = useState(DEFAULT_STAGE);
  const [fallbackSource, setFallbackSource] = useState("CSV import");
  const [isWorking, setIsWorking] = useState(false);

  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setCsvText(await file.text());
  }

  function reset() {
    setStep("paste");
    setCsvText("");
    setPreview(null);
    setMapping({});
  }

  async function goToMapping() {
    setIsWorking(true);
    try {
      const result = await previewCsvMapping({ csvText });
      setPreview(result);
      setMapping(result.suggestedMapping);
      setStep("map");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to read CSV");
    } finally {
      setIsWorking(false);
    }
  }

  async function submitImport() {
    setIsWorking(true);
    try {
      const result = await importLeadsCsvMapped({
        csvText,
        mapping,
        pipelineStageId: pipelineStageId === DEFAULT_STAGE ? "" : pipelineStageId,
        fallbackSource,
      });

      if (result.failed > 0) {
        toast.warning(
          `Imported ${result.imported} leads; ${result.failed} rows failed`,
          { description: result.errors.slice(0, 3).join("\n") },
        );
      } else {
        toast.success(`Imported ${result.imported} leads`);
      }

      if (result.imported > 0) {
        setOpen(false);
        reset();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to import CSV");
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          reset();
        }
      }}
    >
      <DialogTrigger render={<Button variant="outline" />}>
        <Upload className="size-4" />
        Import CSV
      </DialogTrigger>
      <DialogContent className={step === "map" ? "sm:max-w-2xl" : "sm:max-w-lg"}>
        <DialogHeader>
          <DialogTitle>
            {step === "paste" ? "Import leads" : "Map your columns"}
          </DialogTitle>
        </DialogHeader>

        {step === "paste" && (
          <div className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="csv-file">CSV file</FieldLabel>
              <Input id="csv-file" type="file" accept=".csv,text/csv" onChange={readFile} />
              <FieldDescription>
                Works with exports from Podio, REsimpli, InvestorFuse, Google
                Sheets, or any other CRM — you'll map columns to fields next.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="csv-text">CSV content</FieldLabel>
              <Textarea
                id="csv-text"
                value={csvText}
                onChange={(event) => setCsvText(event.target.value)}
                className="min-h-48 font-mono text-xs"
                placeholder={"Name,Phone,Property Address,Asking Price\nJane Doe,555-1234,123 Main St,195000"}
              />
            </Field>
          </div>
        )}

        {step === "map" && preview && (
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel>Default stage</FieldLabel>
                <Select
                  value={pipelineStageId}
                  onValueChange={(value) => value && setPipelineStageId(value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(value: string) =>
                        value === DEFAULT_STAGE
                          ? "First pipeline stage"
                          : (stages.find((stage) => stage.id === value)?.name ??
                            "Stage")
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={DEFAULT_STAGE}>First pipeline stage</SelectItem>
                    {stages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="fallback-source">Fallback source</FieldLabel>
                <Input
                  id="fallback-source"
                  value={fallbackSource}
                  onChange={(event) => setFallbackSource(event.target.value)}
                />
              </Field>
            </div>

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
                            {CRM_FIELD_GROUPS.map((group) => (
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
          </div>
        )}

        <DialogFooter>
          {step === "paste" ? (
            <Button onClick={goToMapping} disabled={isWorking || !csvText.trim()}>
              {isWorking ? "Reading..." : "Next: map columns"}
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setStep("paste")} disabled={isWorking}>
                Back
              </Button>
              <Button onClick={submitImport} disabled={isWorking}>
                {isWorking ? "Importing..." : "Import leads"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
