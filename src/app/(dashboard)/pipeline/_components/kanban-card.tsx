"use client";

import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { LeadWithContact } from "@/lib/queries/pipeline";
import type { Tables } from "@/lib/supabase/types";

interface KanbanCardProps {
  lead: LeadWithContact;
  stages: Tables<"pipeline_stages">[];
  onMoveLead: (leadId: string, newStageId: string) => void;
  dragOverlay?: boolean;
}

export function KanbanCard({
  lead,
  stages,
  onMoveLead,
  dragOverlay,
}: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: lead.id });

  const style =
    transform && !dragOverlay
      ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
      : undefined;

  const contactName = lead.contact
    ? [lead.contact.first_name, lead.contact.last_name]
        .filter(Boolean)
        .join(" ")
    : "Unknown contact";

  return (
    <Card
      ref={dragOverlay ? undefined : setNodeRef}
      style={style}
      className={`gap-2 py-3 ${isDragging ? "opacity-40" : ""} ${dragOverlay ? "shadow-lg" : ""}`}
      {...(dragOverlay ? {} : { ...listeners, ...attributes })}
    >
      <CardContent className="flex flex-col gap-2 px-3">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/leads/${lead.id}`}
            className="text-sm font-medium hover:underline"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {lead.title}
          </Link>
          {lead.value != null && (
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              ${Number(lead.value).toLocaleString()}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{contactName}</p>
        <p className="text-xs text-muted-foreground">
          {lead.ownerEmail ? `Owner: ${lead.ownerEmail}` : "Unassigned"}
        </p>
        {lead.searchRelevance != null && (
          <div className="flex flex-wrap gap-1">
            <Badge className="bg-primary text-primary-foreground text-[10px]">
              {lead.searchRelevance}% match
            </Badge>
            {lead.matchReasons.slice(0, 1).map((reason) => (
              <Badge key={reason} variant="quiet" className="text-[10px]">
                {reason}
              </Badge>
            ))}
            {lead.matchReasons.length > 1 && (
              <Badge variant="quiet" className="text-[10px]">
                +{lead.matchReasons.length - 1}
              </Badge>
            )}
          </div>
        )}
        {lead.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {lead.tags.map((tag) => (
              <Badge key={tag.id} variant="quiet" className="text-[10px]">
                {tag.name}
              </Badge>
            ))}
          </div>
        )}
        <div onPointerDown={(e) => e.stopPropagation()}>
          <Select
            value={lead.pipeline_stage_id}
            onValueChange={(value) => value && onMoveLead(lead.id, value)}
          >
            <SelectTrigger size="sm" className="h-7 w-full text-xs">
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
        </div>
      </CardContent>
    </Card>
  );
}
