"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { clearContactSmsOptOut } from "@/lib/actions/contacts";

interface ContactSmsOptOutBadgeProps {
  contactId: string;
  smsOptedOutAt: string | null;
  isAdmin: boolean;
}

export function ContactSmsOptOutBadge({
  contactId,
  smsOptedOutAt,
  isAdmin,
}: ContactSmsOptOutBadgeProps) {
  const [optedOutAt, setOptedOutAt] = useState(smsOptedOutAt);
  const [clearing, setClearing] = useState(false);

  if (!optedOutAt) {
    return null;
  }

  async function handleClear() {
    setClearing(true);
    try {
      await clearContactSmsOptOut(contactId);
      setOptedOutAt(null);
      toast.success("SMS opt-out cleared");
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
      <Badge variant="destructive">Replied STOP to SMS</Badge>
      {isAdmin && (
        <Button size="sm" variant="outline" disabled={clearing} onClick={handleClear}>
          {clearing ? "Clearing..." : "Clear opt-out"}
        </Button>
      )}
    </div>
  );
}
