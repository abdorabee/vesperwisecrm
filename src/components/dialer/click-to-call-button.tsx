"use client";

import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDialerSession } from "@/components/dialer/dialer-session-provider";
import {
  OUTSIDE_CALLING_HOURS_MESSAGE,
  evaluateCallingHours,
} from "@/lib/dialer/calling-hours";

export function ClickToCallButton({
  contactId,
  contactName,
  leadId,
  queueItemId,
  phone,
  postalCode,
  disabled = false,
  size = "sm",
}: {
  contactId: string;
  contactName: string;
  leadId?: string | null;
  queueItemId?: string | null;
  phone?: string | null;
  postalCode?: string | null;
  disabled?: boolean;
  size?: "sm" | "default";
}) {
  const dialer = useDialerSession();
  const hoursReason = phone
    ? evaluateCallingHours({ phone, postalCode }).reason
    : null;

  const blockedReason = hoursReason
    ? hoursReason
    : !dialer.enabled
      ? "Dialer is not enabled"
      : !dialer.twilioConnected
        ? "Connect a Twilio account in Settings → Calling before calling"
        : undefined;
  const label = hoursReason
    ? hoursReason === OUTSIDE_CALLING_HOURS_MESSAGE
      ? "Outside calling hours"
      : "Local time unknown"
    : dialer.starting
      ? "Starting…"
      : "Call";
  return (
    <Button
      type="button"
      size={size}
      disabled={Boolean(blockedReason) || disabled || dialer.starting}
      title={blockedReason}
      onClick={() => void dialer.start({ contactId, contactName, leadId, queueItemId })}
    >
      <Phone className="size-4" />
      {label}
    </Button>
  );
}
