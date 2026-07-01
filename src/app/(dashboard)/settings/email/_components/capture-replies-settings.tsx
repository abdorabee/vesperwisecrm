"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
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
    <FieldGroup>
      <Field orientation="horizontal">
        <Checkbox
          id="capture-replies"
          checked={checked}
          disabled={disabled || isPending}
          onChange={(event) => handleChange(event.target.checked)}
          className="mt-0.5"
        />
        <div className="flex flex-col gap-1">
          <FieldLabel htmlFor="capture-replies" className="font-medium">
            Capture replies in CRM
          </FieldLabel>
          <p className="text-sm text-muted-foreground">
            When enabled, outbound emails include a Reply-To address so lead
            replies appear in the activity feed.
          </p>
        </div>
      </Field>
      {inboundAddressPattern ? (
        <p className="rounded-lg border bg-muted/30 p-3 font-mono text-xs text-muted-foreground">
          {inboundAddressPattern}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Inbound address pattern is not configured on this deployment.
        </p>
      )}
    </FieldGroup>
  );
}
