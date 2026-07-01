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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { importLeadsCsv } from "@/lib/actions/leads";
import type { Tables } from "@/lib/supabase/types";

interface ImportLeadsDialogProps {
  stages: Tables<"pipeline_stages">[];
}

const DEFAULT_STAGE = "__default__";

export function ImportLeadsDialog({ stages }: ImportLeadsDialogProps) {
  const [open, setOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [pipelineStageId, setPipelineStageId] = useState(DEFAULT_STAGE);
  const [fallbackSource, setFallbackSource] = useState("CSV import");
  const [isImporting, setIsImporting] = useState(false);

  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setCsvText(await file.text());
  }

  async function submitImport() {
    setIsImporting(true);
    try {
      const result = await importLeadsCsv({
        csvText,
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
        setCsvText("");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to import CSV");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <Upload className="size-4" />
        Import CSV
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import leads</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="csv-file">CSV file</FieldLabel>
            <Input id="csv-file" type="file" accept=".csv,text/csv" onChange={readFile} />
            <FieldDescription>
              Headers: title, first_name, last_name, name, email, phone, company,
              value, source, address, city, state, zip, contract_status,
              contract_amount, pipeline_stage_id.
            </FieldDescription>
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel>Default stage</FieldLabel>
              <Select value={pipelineStageId} onValueChange={(value) => value && setPipelineStageId(value)}>
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

          <Field>
            <FieldLabel htmlFor="csv-text">CSV content</FieldLabel>
            <Textarea
              id="csv-text"
              value={csvText}
              onChange={(event) => setCsvText(event.target.value)}
              className="min-h-48 font-mono text-xs"
              placeholder={"title,first_name,last_name,email,phone,company,source,address,city,state,contract_status\nWebsite lead,Jane,Doe,jane@example.com,5551234567,Acme,Website,123 Main St,Austin,TX,offered"}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button onClick={submitImport} disabled={isImporting || !csvText.trim()}>
            {isImporting ? "Importing..." : "Import leads"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
