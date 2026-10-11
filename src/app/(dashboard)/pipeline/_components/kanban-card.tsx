"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDraggable } from "@dnd-kit/core";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { LeadNextAction, LeadWithContact } from "@/lib/queries/pipeline";
import type { Tables } from "@/lib/supabase/types";
import { ClickToCallButton } from "@/components/dialer/click-to-call-button";
import { WorkspaceCurrency } from "@/components/workspace-formatting-context";
import { createLeadTask } from "@/lib/actions/tasks";
import { formatRelativeDue } from "@/lib/dates/relative-due";
import { cn } from "@/lib/utils";

interface KanbanCardProps {
  lead: LeadWithContact;
  stages: Tables<"pipeline_stages">[];
  onMoveLead: (leadId: string, newStageId: string) => void;
  dragOverlay?: boolean;
}

function stopPointer(event: React.PointerEvent) {
  event.stopPropagation();
}

function defaultDueInput(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function earlierAction(
  current: LeadNextAction | null,
  created: LeadNextAction | null,
): LeadNextAction | null {
  if (!created) return current;
  if (!current) return created;
  return new Date(created.dueAt).getTime() < new Date(current.dueAt).getTime()
    ? created
    : current;
}

function NextActionBlock({
  leadId,
  action,
  dragOverlay,
}: {
  leadId: string;
  action: LeadNextAction | null;
  dragOverlay?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState(defaultDueInput);
  const [created, setCreated] = useState<LeadNextAction | null>(null);
  const shown = earlierAction(action, created);
  const relative = shown ? formatRelativeDue(shown.dueAt) : null;

  function save() {
    const trimmed = title.trim();
    if (!trimmed || !dueAt) return;

    startTransition(async () => {
      try {
        await createLeadTask(leadId, {
          title: trimmed,
          dueAt,
          priority: "normal",
          assignedUserId: "",
        });
        setCreated({
          title: trimmed,
          dueAt: new Date(dueAt).toISOString(),
          source: "task",
        });
        setTitle("");
        setOpen(false);
        toast.success("Next action saved");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to save next action",
        );
      }
    });
  }

  return (
    <div className="flex flex-col gap-1.5" onPointerDown={stopPointer}>
      {shown && relative ? (
        <div
          className={cn(
            "rounded-md px-2 py-1.5",
            relative.overdue ? "bg-destructive/10" : "bg-muted/70",
          )}
        >
          <p className="line-clamp-2 text-xs font-medium text-foreground">
            {shown.source === "sequence" ? `Sequence: ${shown.title}` : shown.title}
          </p>
          <p
            className={cn(
              "text-xs",
              relative.overdue
                ? "font-medium text-destructive"
                : "text-muted-foreground",
            )}
            suppressHydrationWarning
          >
            {relative.overdue ? `Overdue · ${relative.label}` : relative.label}
          </p>
        </div>
      ) : (
        <Badge variant="outline" className="w-fit text-[10px]">
          No next action
        </Badge>
      )}
      {!dragOverlay &&
        (open ? (
          <form
            className="flex flex-col gap-1.5"
            onSubmit={(event) => {
              event.preventDefault();
              save();
            }}
          >
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Next action"
              aria-label="Next action"
              className="h-7 text-xs"
              required
            />
            <Input
              type="datetime-local"
              value={dueAt}
              onChange={(event) => setDueAt(event.target.value)}
              aria-label="Due date"
              className="h-7 text-xs"
              required
            />
            <div className="flex gap-1">
              <Button
                type="submit"
                size="xs"
                disabled={isPending || !title.trim()}
              >
                Save
              </Button>
              <Button
                type="button"
                size="xs"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button
            type="button"
            size="xs"
            variant="ghost"
            className="w-fit px-1"
            onClick={() => setOpen(true)}
          >
            Set next action
          </Button>
        ))}
    </div>
  );
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

  const overdue = lead.nextAction
    ? formatRelativeDue(lead.nextAction.dueAt).overdue
    : false;

  return (
    <Card
      ref={dragOverlay ? undefined : setNodeRef}
      style={style}
      tone={overdue ? "destructive" : "default"}
      className={cn(
        "gap-2 py-3",
        isDragging && "opacity-40",
        dragOverlay && "shadow-lg",
        overdue && "bg-destructive/5",
      )}
      {...(dragOverlay ? {} : { ...listeners, ...attributes })}
    >
      <CardContent className="flex flex-col gap-2 px-3">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/leads/${lead.id}`}
            className="text-sm font-medium hover:underline"
            onPointerDown={stopPointer}
          >
            {lead.title}
          </Link>
          {lead.value != null && (
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              <WorkspaceCurrency value={Number(lead.value)} />
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{contactName}</p>
        <NextActionBlock
          leadId={lead.id}
          action={lead.nextAction}
          dragOverlay={dragOverlay}
        />
        {lead.contact?.phone && !dragOverlay && (
          <div onPointerDown={stopPointer}>
            <ClickToCallButton
              contactId={lead.contact.id}
              contactName={contactName}
              leadId={lead.id}
            />
          </div>
        )}
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
        <div onPointerDown={stopPointer}>
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
