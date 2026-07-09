"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateLeadReport } from "@/lib/actions/google";

interface GenerateReportButtonProps {
  leadId: string;
  existingDocUrl: string | null;
}

export function GenerateReportButton({
  leadId,
  existingDocUrl,
}: GenerateReportButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [docUrl, setDocUrl] = useState(existingDocUrl);

  function handleGenerate() {
    startTransition(async () => {
      try {
        const { url } = await generateLeadReport(leadId);
        setDocUrl(url);
        toast.success("Property report generated");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to generate report",
        );
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleGenerate}
        disabled={isPending}
      >
        <FileText className="size-3.5" />
        {isPending
          ? "Generating..."
          : docUrl
            ? "Regenerate report"
            : "Generate report"}
      </Button>
      {docUrl && (
        <a
          href={docUrl}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-primary hover:underline"
        >
          Open latest report
        </a>
      )}
    </div>
  );
}
