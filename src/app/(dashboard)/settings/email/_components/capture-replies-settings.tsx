"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { updateCaptureRepliesSetting } from "@/lib/actions/account-email";

interface CaptureRepliesSettingsProps {
  enabled: boolean;
  inboundAddressPattern: string | null;
  disabled: boolean;
}

export function CaptureRepliesSettings({
  enabled,
  inboundAddressPattern,
  disabled,
}: CaptureRepliesSettingsProps) {
  const [checked, setChecked] = useState(enabled);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: boolean) {
    setChecked(next);
    startTransition(async () => {
      try {
        await updateCaptureRepliesSetting(next);
        toast.success(
          next ? "Reply capture enabled" : "Reply capture disabled",
        );
      } catch (error) {
        setChecked(!next);
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to update reply capture setting",
        );
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <input
          id="capture-replies"
          type="checkbox"
          className="mt-1 size-4 rounded border"
          checked={checked}
          disabled={disabled || isPending}
          onChange={(event) => handleChange(event.target.checked)}
        />
        <div className="flex flex-col gap-1">
          <Label htmlFor="capture-replies" className="font-medium">
            Capture replies in CRM
          </Label>
          <p className="text-sm text-muted-foreground">
            When enabled, outbound emails include a Reply-To address so lead
            replies appear in the activity feed.
          </p>
        </div>
      </div>
      {inboundAddressPattern ? (
        <p className="rounded-lg border bg-muted/30 p-3 font-mono text-xs text-muted-foreground">
          {inboundAddressPattern}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Inbound address pattern is not configured on this deployment.
        </p>
      )}
    </div>
  );
}
