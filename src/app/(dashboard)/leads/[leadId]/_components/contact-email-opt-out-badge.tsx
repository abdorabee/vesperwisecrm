"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { clearContactEmailOptOut } from "@/lib/actions/contacts";

interface ContactEmailOptOutBadgeProps {
  contactId: string;
  emailOptedOutAt: string | null;
  isAdmin: boolean;
}

export function ContactEmailOptOutBadge({
  contactId,
  emailOptedOutAt,
  isAdmin,
}: ContactEmailOptOutBadgeProps) {
  const [optedOutAt, setOptedOutAt] = useState(emailOptedOutAt);
  const [clearing, setClearing] = useState(false);

  if (!optedOutAt) {
    return null;
  }

  async function handleClear() {
    setClearing(true);
    try {
      await clearContactEmailOptOut(contactId);
      setOptedOutAt(null);
      toast.success("Email opt-out cleared");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to clear opt-out",
      );
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <Badge variant="destructive">Unsubscribed from marketing email</Badge>
      {isAdmin && (
        <Button size="sm" variant="outline" disabled={clearing} onClick={handleClear}>
          {clearing ? "Clearing..." : "Clear opt-out"}
        </Button>
      )}
    </div>
  );
}
