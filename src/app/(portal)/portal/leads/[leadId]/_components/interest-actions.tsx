"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { setClientInterest } from "@/lib/actions/portal";

interface InterestActionsProps {
  leadId: string;
  status: string | null;
}

export function InterestActions({ leadId, status }: InterestActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [currentStatus, setCurrentStatus] = useState(status);

  function handleSet(next: "interested" | "declined") {
    startTransition(async () => {
      try {
        await setClientInterest(leadId, { status: next });
        setCurrentStatus(next);
        toast.success(
          next === "interested" ? "Marked as interested" : "Marked as passed",
        );
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to update",
        );
      }
    });
  }

  if (currentStatus === "interested") {
    return <Badge className="bg-emerald-500/20 text-emerald-400">You're interested</Badge>;
  }
  if (currentStatus === "declined") {
    return <Badge variant="secondary">You passed on this one</Badge>;
  }

  return (
    <div className="flex gap-2">
      <Button
        type="button"
        size="sm"
        onClick={() => handleSet("interested")}
        disabled={isPending}
      >
        <Check className="size-3.5" />
        I'm interested
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => handleSet("declined")}
        disabled={isPending}
      >
        <X className="size-3.5" />
        Not for me
      </Button>
    </div>
  );
}
