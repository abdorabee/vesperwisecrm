"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, Check, HelpCircle, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { qualifyLead, rejectLead, requestLeadInfo } from "@/lib/actions/qualification";
import type { SubmittedLead } from "@/lib/queries/qualification";
import type { GroupWithMembers } from "@/lib/queries/groups";

const SLA_HOURS = 4;

type PendingAction = "reject" | "needs_info" | null;

function hoursSince(dateString: string): number {
  return (Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60);
}

function summaryLine(property: SubmittedLead["property"]): string {
  if (!property) {
    return "No property details captured yet";
  }

  const parts = [
    property.condition ? `Condition: ${property.condition}` : null,
    property.asking_price ? `$${Number(property.asking_price).toLocaleString()}` : null,
    property.motivation ? `Motivation: ${property.motivation}` : null,
    property.timeline ? `Timeline: ${property.timeline}` : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" · ") : "No property details captured yet";
}

interface QueueRowProps {
  lead: SubmittedLead;
  groups: GroupWithMembers[];
}

function QueueRow({ lead, groups }: QueueRowProps) {
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [note, setNote] = useState("");
  const [groupId, setGroupId] = useState<string>(groups[0]?.id ?? "");

  const contactName = [lead.contact.first_name, lead.contact.last_name]
    .filter(Boolean)
    .join(" ");
  const overdue = hoursSince(lead.created_at) > SLA_HOURS;

  function handleConfirm() {
    startTransition(async () => {
      try {
        await qualifyLead(lead.id, groupId || undefined);
        toast.success("Lead qualified and routed to acquisitions");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to qualify lead");
      }
    });
  }

  function handleReject() {
    startTransition(async () => {
      try {
        await rejectLead(lead.id, { reason: note });
        toast.success("Lead rejected");
        setPendingAction(null);
        setNote("");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to reject lead");
      }
    });
  }

  function handleNeedsInfo() {
    startTransition(async () => {
      try {
        await requestLeadInfo(lead.id, { note });
        toast.success("Sent back to the caller with a follow-up task");
        setPendingAction(null);
        setNote("");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to request info",
        );
      }
    });
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link
              href={`/leads/${lead.id}`}
              className="font-medium hover:underline"
            >
              {lead.title}
            </Link>
            <p className="text-sm text-muted-foreground">
              {contactName || "No name"}
              {lead.contact.phone ? ` · ${lead.contact.phone}` : ""}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {summaryLine(lead.property)}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {overdue && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="size-3" />
                Overdue
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              Submitted {new Date(lead.created_at).toLocaleString()}
            </span>
          </div>
        </div>

        {pendingAction === null && (
          <div className="flex flex-wrap items-center gap-2">
            {groups.length > 0 && (
              <Select value={groupId} onValueChange={(value) => value && setGroupId(value)}>
                <SelectTrigger size="sm" className="w-48">
                  <SelectValue placeholder="Route to group" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button size="sm" onClick={handleConfirm} disabled={isPending}>
              <Check className="size-3.5" />
              Confirm
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPendingAction("needs_info")}
              disabled={isPending}
            >
              <HelpCircle className="size-3.5" />
              Needs info
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPendingAction("reject")}
              disabled={isPending}
            >
              <X className="size-3.5" />
              Reject
            </Button>
          </div>
        )}

        {pendingAction !== null && (
          <div className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-3">
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={
                pendingAction === "reject"
                  ? "Why is this lead being rejected?"
                  : "What's missing before this can be qualified?"
              }
              className="min-h-16"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setPendingAction(null);
                  setNote("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={pendingAction === "reject" ? handleReject : handleNeedsInfo}
                disabled={isPending || note.trim().length === 0}
              >
                {pendingAction === "reject" ? "Reject lead" : "Send back"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface QueueListProps {
  leads: SubmittedLead[];
  groups: GroupWithMembers[];
}

export function QueueList({ leads, groups }: QueueListProps) {
  if (leads.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No submitted leads waiting on review.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {leads.map((lead) => (
        <QueueRow key={lead.id} lead={lead} groups={groups} />
      ))}
    </div>
  );
}
