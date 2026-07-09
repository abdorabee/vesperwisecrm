"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { disconnectGoogle, updateDriveFolder } from "@/lib/actions/google";
import type { Tables } from "@/lib/supabase/types";

interface GoogleConnectionCardProps {
  integration: Tables<"google_integrations"> | null;
  configured: boolean;
  connected: boolean;
  error: string | null;
}

export function GoogleConnectionCard({
  integration,
  configured,
  connected,
  error,
}: GoogleConnectionCardProps) {
  const [folderId, setFolderId] = useState(integration?.drive_folder_id ?? "");
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    if (connected) {
      toast.success("Google account connected");
    }
    if (error) {
      toast.error(`Google connection failed: ${error}`);
    }
  }, [connected, error]);

  async function handleSaveFolder() {
    setSaving(true);
    try {
      await updateDriveFolder(folderId);
      toast.success("Drive folder saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save folder");
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await disconnectGoogle();
      toast.success("Google account disconnected");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  }

  if (!integration) {
    return (
      <div className="flex flex-col gap-3">
        <Badge variant="secondary" className="w-fit">
          Not connected
        </Badge>
        <Button
          render={<a href="/api/google/authorize" />}
          nativeButton={false}
          disabled={!configured}
          className="w-fit"
        >
          Connect Google account
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Badge className="w-fit">Connected</Badge>
        {integration.connected_email && (
          <span className="text-sm text-muted-foreground">
            as {integration.connected_email}
          </span>
        )}
      </div>

      <Field>
        <FieldLabel htmlFor="drive-folder-id">
          Drive folder ID (optional)
        </FieldLabel>
        <div className="flex gap-2">
          <Input
            id="drive-folder-id"
            value={folderId}
            onChange={(event) => setFolderId(event.target.value)}
            placeholder="Paste a Drive folder ID to save reports into it"
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveFolder}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </Field>

      <Button
        type="button"
        variant="outline"
        className="w-fit"
        onClick={handleDisconnect}
        disabled={disconnecting}
      >
        {disconnecting ? "Disconnecting..." : "Disconnect"}
      </Button>
    </div>
  );
}
