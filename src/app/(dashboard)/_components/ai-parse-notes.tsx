"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { parseCallNotesAction } from "@/lib/actions/ai";
import type { ExtractedCallNoteFields } from "@/lib/ai/parse-call-notes";

interface AiParseNotesProps {
  onExtracted: (fields: ExtractedCallNoteFields) => void;
}

function countFilledFields(fields: ExtractedCallNoteFields): number {
  return Object.values(fields).filter((value) => value != null && value !== "").length;
}

export function AiParseNotes({ onExtracted }: AiParseNotesProps) {
  const [isPending, startTransition] = useTransition();
  const [rawText, setRawText] = useState("");

  function handleParse() {
    startTransition(async () => {
      try {
        const fields = await parseCallNotesAction(rawText);
        const filledCount = countFilledFields(fields);
        if (filledCount === 0) {
          toast.info("Didn't find any property details in that text");
          return;
        }
        onExtracted(fields);
        toast.success(`Filled ${filledCount} field${filledCount === 1 ? "" : "s"} from your notes`);
        setRawText("");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to parse notes");
      }
    });
  }

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="size-4 text-primary" />
          Paste raw call notes
        </div>
        <p className="text-xs text-muted-foreground">
          Paste whatever you jotted down during the call and we'll fill in the fields below for you to review.
        </p>
        <Textarea
          value={rawText}
          onChange={(event) => setRawText(event.target.value)}
          placeholder="Condition good, new roof/AC/bathrooms, owner moving, wants $195k, ASAP, call Jerry..."
          className="min-h-20"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={handleParse}
          disabled={isPending || rawText.trim().length === 0}
        >
          {isPending ? "Parsing..." : "Parse notes"}
        </Button>
      </CardContent>
    </Card>
  );
}
