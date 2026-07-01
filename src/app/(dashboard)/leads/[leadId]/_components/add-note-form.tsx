"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addLeadNote } from "@/lib/actions/leads";

interface AddNoteFormProps {
  leadId: string;
}

export function AddNoteForm({ leadId }: AddNoteFormProps) {
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  function submitNote() {
    const trimmedNote = note.trim();
    if (!trimmedNote) {
      toast.error("Note is required");
      return;
    }

    startTransition(async () => {
      try {
        await addLeadNote(leadId, { note: trimmedNote });
        setNote("");
        toast.success("Note added");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to add note");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Add a note..."
        className="min-h-20"
      />
      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={submitNote} disabled={isPending}>
          {isPending ? "Adding..." : "Add note"}
        </Button>
      </div>
    </div>
  );
}
