"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateLeadStage } from "@/lib/actions/leads";
import type { Tables } from "@/lib/supabase/types";

interface StageSelectProps {
  leadId: string;
  currentStageId: string;
  stages: Tables<"pipeline_stages">[];
}

export function StageSelect({ leadId, currentStageId, stages }: StageSelectProps) {
  const [stageId, setStageId] = useState(currentStageId);
  const [, startTransition] = useTransition();

  function handleChange(newStageId: string | null) {
    if (!newStageId) return;
    const previous = stageId;
    setStageId(newStageId);

    startTransition(async () => {
      try {
        await updateLeadStage(leadId, newStageId);
      } catch (error) {
        setStageId(previous);
        toast.error(
          error instanceof Error ? error.message : "Failed to update stage",
        );
      }
    });
  }

  return (
    <Select value={stageId} onValueChange={handleChange}>
      <SelectTrigger className="w-56">
        <SelectValue>
          {(value: string) =>
            stages.find((stage) => stage.id === value)?.name ?? value
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {stages.map((stage) => (
          <SelectItem key={stage.id} value={stage.id}>
            {stage.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
