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
      <TableCell className="font-medium">{row.accountName}</TableCell>
      <TableCell>{row.sendingDomain ?? "—"}</TableCell>
      <TableCell>
        {row.domainVerificationStatus ? (
          <Badge variant="secondary">{row.domainVerificationStatus}</Badge>
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell className="tabular-nums">{row.outbound30d}</TableCell>
      <TableCell className="tabular-nums">{row.bounces30d}</TableCell>
      <TableCell className="tabular-nums">{row.complaints30d}</TableCell>
      <TableCell>
        {row.outboundSuspended ? (
          <Badge variant="destructive">Suspended</Badge>
        ) : (
          <Badge variant="outline">Active</Badge>
        )}
      </TableCell>
      <TableCell>
        {row.outboundSuspended ? (
          <Button size="sm" disabled={loading} onClick={handleUnsuspend}>
            Unsuspend
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Input
              placeholder="Reason"
              className="h-8 w-32"
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
