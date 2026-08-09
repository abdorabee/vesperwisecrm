"use client";

import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDialerSession } from "@/components/dialer/dialer-session-provider";

export function ClickToCallButton({
  contactId,
  contactName,
  leadId,
  queueItemId,
  disabled = false,
  size = "sm",
}: {
  contactId: string;
  contactName: string;
  leadId?: string | null;
  queueItemId?: string | null;
  disabled?: boolean;
  size?: "sm" | "default";
}) {
  const dialer = useDialerSession();
  const blockedReason = !dialer.enabled
    ? "Dialer is not enabled"
    : !dialer.twilioConnected
      ? "Connect a Twilio account in Settings → Calling before calling"
      : undefined;
  return (
    <Button
      type="button"
      size={size}
      disabled={Boolean(blockedReason) || disabled || dialer.starting}
      title={blockedReason}
      onClick={() => void dialer.start({ contactId, contactName, leadId, queueItemId })}
    >
      <Phone className="size-4" />
      {dialer.starting ? "Starting…" : "Call"}
    </Button>
  );
}
