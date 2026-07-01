"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  suspendAccountOutbound,
  unsuspendAccountOutbound,
} from "@/lib/actions/platform-email";
import type { PlatformAccountEmailRow } from "@/lib/queries/platform-email";

interface PlatformAccountRowProps {
  row: PlatformAccountEmailRow;
}

function statusBadgeVariant(
  status: string | null,
): "default" | "secondary" | "destructive" | "outline" {
  if (!status) return "outline";
  if (status === "verified") return "default";
  if (status === "failed") return "destructive";
  return "secondary";
}

export function PlatformAccountRow({ row }: PlatformAccountRowProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSuspend() {
    setLoading(true);
    try {
      await suspendAccountOutbound(row.accountId, reason);
      toast.success("Outbound email suspended");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to suspend account",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleUnsuspend() {
    setLoading(true);
    try {
      await unsuspendAccountOutbound(row.accountId);
      toast.success("Outbound email unsuspended");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to unsuspend account",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <TableRow>
      <TableCell className="py-4 font-medium">{row.accountName}</TableCell>
      <TableCell className="py-4">{row.sendingDomain ?? "—"}</TableCell>
      <TableCell className="py-4">
        {row.domainVerificationStatus ? (
          <Badge variant={statusBadgeVariant(row.domainVerificationStatus)}>
            {row.domainVerificationStatus}
          </Badge>
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell className="py-4 tabular-nums">{row.outbound30d}</TableCell>
      <TableCell className="py-4 tabular-nums">{row.bounces30d}</TableCell>
      <TableCell className="py-4 tabular-nums">{row.complaints30d}</TableCell>
      <TableCell className="py-4">
        {row.outboundSuspended ? (
          <Badge variant="destructive">Suspended</Badge>
        ) : (
          <Badge variant="outline">Active</Badge>
        )}
      </TableCell>
      <TableCell className="py-4">
        {row.outboundSuspended ? (
          <Button size="sm" disabled={loading} onClick={handleUnsuspend}>
            Unsuspend
          </Button>
        ) : (
          <div className="flex items-center gap-3">
            <Input
              placeholder="Reason"
              className="h-8 w-40"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <Button
              size="sm"
              variant="destructive"
              disabled={loading}
              onClick={handleSuspend}
            >
              Suspend
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}
