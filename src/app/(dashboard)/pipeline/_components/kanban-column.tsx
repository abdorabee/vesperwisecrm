"use client";

import { useDroppable } from "@dnd-kit/core";
import { KanbanCard } from "./kanban-card";
import type { LeadWithContact } from "@/lib/queries/pipeline";
import type { Tables } from "@/lib/supabase/types";

interface KanbanColumnProps {
  stage: Tables<"pipeline_stages">;
  stages: Tables<"pipeline_stages">[];
  leads: LeadWithContact[];
  onMoveLead: (leadId: string, newStageId: string) => void;
}

export function KanbanColumn({
  stage,
  stages,
  leads,
  onMoveLead,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-lg border bg-muted/30 p-3 ${
        isOver ? "ring-2 ring-primary" : ""
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{stage.name}</h3>
        <span className="text-xs text-muted-foreground tabular-nums">{leads.length}</span>
      </div>
      <div className="flex min-h-12 flex-col gap-2">
        {leads.map((lead) => (
          <KanbanCard
            key={lead.id}
            lead={lead}
            stages={stages}
            onMoveLead={onMoveLead}
          />
        ))}
      </div>
    </div>
  );
}
