"use client";

import { useState, useTransition } from "react";
import { Copy, ExternalLink, MonitorPlay, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createTvDisplayTokenAction,
  revokeTvDisplayTokenAction,
} from "@/lib/actions/tv";
import type { Tables } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

export function TvDisplayPanel({
  tokens,
}: {
  tokens: Tables<"tv_display_tokens">[];
}) {
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    startTransition(async () => {
      try {
        await createTvDisplayTokenAction(name);
        setName("");
        toast.success("TV display link created");
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    });
  }

  function handleRevoke(id: string) {
    startTransition(async () => {
      try {
        await revokeTvDisplayTokenAction(id);
        toast.success("TV display link revoked");
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    });
  }

  async function handleCopy(token: string) {
    await navigator.clipboard.writeText(
      `${window.location.origin}/tv/${token}`,
    );
    toast.success("Display URL copied");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Display name, e.g. Office TV"
          className="max-w-xs"
        />
        <Button
          type="button"
          onClick={handleCreate}
          disabled={isPending || !name.trim()}
        >
          <MonitorPlay className="size-4" />
          Create display link
        </Button>
      </div>

      {tokens.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No TV display links yet. Create one and open it on the office TV — it
          shows live team KPIs without needing a login.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {tokens.map((token) => (
            <li
              key={token.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border p-3 text-sm"
            >
              <span className="font-medium">{token.name}</span>
              <span className="text-xs text-muted-foreground">
                created {new Date(token.created_at).toLocaleDateString()}
              </span>
              <span className="ml-auto flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(token.token)}
                >
                  <Copy className="size-3.5" />
                  Copy URL
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  render={
                    // eslint-disable-next-line jsx-a11y/anchor-has-content
                    <a
                      href={`/tv/${token.token}`}
                      target="_blank"
                      rel="noreferrer"
                    />
                  }
                  nativeButton={false}
                >
                  <ExternalLink className="size-3.5" />
                  Open
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleRevoke(token.id)}
                >
                  <Trash2 className="size-3.5" />
                  Revoke
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
