"use client";

import { useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { updateLeadStage } from "@/lib/actions/leads";
import { KanbanColumn } from "./kanban-column";
import { KanbanCard } from "./kanban-card";
import type { LeadWithContact } from "@/lib/queries/pipeline";
import type { Tables } from "@/lib/supabase/types";

interface KanbanBoardProps {
  stages: Tables<"pipeline_stages">[];
  leads: LeadWithContact[];
}

export function KanbanBoard({ stages, leads: initialLeads }: KanbanBoardProps) {
  const [leads, setLeads] = useState(initialLeads);
  const [prevInitialLeads, setPrevInitialLeads] = useState(initialLeads);
  const [activeLead, setActiveLead] = useState<LeadWithContact | null>(null);
  const [, startTransition] = useTransition();

  if (initialLeads !== prevInitialLeads) {
    setPrevInitialLeads(initialLeads);
    setLeads(initialLeads);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  function moveLead(leadId: string, newStageId: string) {
    const previous = leads;
    setLeads((current) =>
      current.map((lead) =>
        lead.id === leadId ? { ...lead, pipeline_stage_id: newStageId } : lead,
      ),
    );

    startTransition(async () => {
      try {
        await updateLeadStage(leadId, newStageId);
      } catch (error) {
        setLeads(previous);
        toast.error(
          error instanceof Error ? error.message : "Failed to move lead",
        );
      }
    });
  }

  function handleDragStart(event: DragStartEvent) {
    const lead = leads.find((l) => l.id === event.active.id);
    setActiveLead(lead ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveLead(null);
    const { active, over } = event;
    if (!over) return;

    const newStageId = String(over.id);
    const lead = leads.find((l) => l.id === active.id);
    if (lead && lead.pipeline_stage_id !== newStageId) {
      moveLead(lead.id, newStageId);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            stages={stages}
            leads={leads.filter((lead) => lead.pipeline_stage_id === stage.id)}
            onMoveLead={moveLead}
          />
        ))}
      </div>
      <DragOverlay>
        {activeLead ? (
          <KanbanCard
            lead={activeLead}
            stages={stages}
            onMoveLead={moveLead}
            dragOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
