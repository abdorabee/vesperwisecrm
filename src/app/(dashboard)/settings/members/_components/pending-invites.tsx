"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Clock3 } from "lucide-react";
import { revokeTeamInvite } from "@/lib/actions/team";
import type { PendingInvite } from "@/lib/queries/members";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WorkspaceDate } from "@/components/workspace-formatting-context";

export function PendingInvites({ invites }: { invites: PendingInvite[] }) {
  const [pending, startTransition] = useTransition();
  const [now] = useState(() => Date.now());
  const router = useRouter();
  if (!invites.length) return <p className="text-sm text-muted-foreground">No pending invitations.</p>;

  function revoke(id: string) {
    startTransition(async () => {
      try {
        await revokeTeamInvite(id);
        toast.success("Invitation revoked");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not revoke invitation");
      }
    });
  }

  return (
    <div className="divide-y divide-border rounded-lg border border-border">
      {invites.map((invite) => {
        const expired = new Date(invite.expiresAt).getTime() <= now;
        return (
          <div key={invite.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{invite.email}</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="size-3" />{expired ? "Expired" : <>Expires <WorkspaceDate value={invite.expiresAt} /></>}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{invite.role}</Badge>
              <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => revoke(invite.id)}>Revoke</Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
