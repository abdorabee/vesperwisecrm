"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateOwnSenderIdentity } from "@/lib/actions/team";

interface SenderIdentityFormProps {
  fromDisplayName: string | null;
  fromEmailLocalPart: string | null;
  sendingDomain: string | null;
}

export function SenderIdentityForm({
  fromDisplayName,
  fromEmailLocalPart,
  sendingDomain,
}: SenderIdentityFormProps) {
  const [displayName, setDisplayName] = useState(fromDisplayName ?? "");
  const [localPart, setLocalPart] = useState(fromEmailLocalPart ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateOwnSenderIdentity({
        fromDisplayName: displayName,
        fromEmailLocalPart: localPart,
      });
      toast.success("Sender identity saved");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save sender identity",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="fromDisplayName">
          Display name
        </label>
        <Input
          id="fromDisplayName"
          placeholder="Sarah Jones"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </div>
      {sendingDomain && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium" htmlFor="fromEmailLocalPart">
            Personal email address (optional)
          </label>
          <div className="flex items-center gap-1">
            <Input
              id="fromEmailLocalPart"
              placeholder="sarah"
              value={localPart}
              onChange={(e) => setLocalPart(e.target.value)}
              className="max-w-40"
            />
            <span className="text-sm text-muted-foreground">
              @{sendingDomain}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Leave blank to send from the account default address with your
            display name.
          </p>
        </div>
      )}
      <Button
        type="button"
        size="sm"
        className="w-fit"
        disabled={saving}
        onClick={handleSave}
      >
        {saving ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}
