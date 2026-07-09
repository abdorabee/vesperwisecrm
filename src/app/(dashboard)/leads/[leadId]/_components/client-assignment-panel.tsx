"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assignLeadToClient } from "@/lib/actions/clients";

const UNASSIGNED = "__none__";

interface ClientOption {
  id: string;
  name: string;
}

interface ClientAssignmentPanelProps {
  leadId: string;
  clientId: string | null;
  clientInterestStatus: string | null;
  clients: ClientOption[];
}

function interestBadge(status: string | null) {
  if (status === "interested") {
    return <Badge className="bg-emerald-500/20 text-emerald-400">Interested</Badge>;
  }
  if (status === "declined") {
    return <Badge variant="secondary">Passed</Badge>;
  }
  return <Badge variant="outline">Awaiting response</Badge>;
}

export function ClientAssignmentPanel({
  leadId,
  clientId,
  clientInterestStatus,
  clients,
}: ClientAssignmentPanelProps) {
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string) {
    startTransition(async () => {
      try {
        await assignLeadToClient(leadId, value === UNASSIGNED ? null : value);
        toast.success(
          value === UNASSIGNED ? "Client unassigned" : "Lead assigned to client",
        );
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to assign client",
        );
      }
    });
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <Select
        value={clientId ?? UNASSIGNED}
        onValueChange={(value) => value && handleChange(value)}
      >
        <SelectTrigger className="w-56" disabled={isPending}>
          <SelectValue placeholder="Not assigned to a client">
            {(value: string) =>
              value === UNASSIGNED
                ? "Not assigned to a client"
                : (clients.find((c) => c.id === value)?.name ?? "Client")
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={UNASSIGNED}>Not assigned</SelectItem>
          {clients.map((client) => (
            <SelectItem key={client.id} value={client.id}>
              {client.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {clientId && interestBadge(clientInterestStatus)}
    </div>
  );
}
