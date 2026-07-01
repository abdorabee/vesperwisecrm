"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateReplyRouting } from "@/lib/actions/account-email";
import type { UpdateReplyRoutingInput } from "@/lib/validations/account-email";

interface ReplyRoutingSettingsProps {
  replyRoutingMode: "shared_inbox" | "agent_direct";
  defaultReplyToEmail: string | null;
  disabled?: boolean;
}

export function ReplyRoutingSettings({
  replyRoutingMode,
  defaultReplyToEmail,
  disabled,
}: ReplyRoutingSettingsProps) {
  const [mode, setMode] = useState<"shared_inbox" | "agent_direct">(
    replyRoutingMode,
  );
  const [defaultEmail, setDefaultEmail] = useState(
    defaultReplyToEmail ?? "",
  );
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const input: UpdateReplyRoutingInput = {
        replyRoutingMode: mode,
        defaultReplyToEmail: defaultEmail,
      };
      await updateReplyRouting(input);
      toast.success("Reply routing saved");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save reply routing",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Reply routing</label>
        <Select
          value={mode}
          onValueChange={(value) =>
            value && setMode(value as "shared_inbox" | "agent_direct")
          }
          disabled={disabled}
        >
          <SelectTrigger className="w-full max-w-md">
            <SelectValue>
              {(value: string) =>
                value === "agent_direct"
                  ? "Individual agent"
                  : "Shared inbox (recommended)"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="shared_inbox">
              Shared inbox (recommended)
            </SelectItem>
            <SelectItem value="agent_direct">Individual agent</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          {mode === "shared_inbox"
            ? "Replies route through VesperwiseCRM and appear on the lead activity feed."
            : "Reply-To goes to the assigned lead owner. Inbound reply capture is disabled."}
        </p>
      </div>

      {mode === "agent_direct" && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium" htmlFor="defaultReplyToEmail">
            Default reply-to email
          </label>
          <Input
            id="defaultReplyToEmail"
            type="email"
            placeholder="hello@yourcompany.com"
            value={defaultEmail}
            onChange={(e) => setDefaultEmail(e.target.value)}
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">
            Used when a lead has no assigned owner.
          </p>
        </div>
      )}

      <Button
        type="button"
        size="sm"
        className="w-fit"
        disabled={disabled || saving}
        onClick={handleSave}
      >
        {saving ? "Saving..." : "Save reply routing"}
      </Button>
    </div>
  );
}
