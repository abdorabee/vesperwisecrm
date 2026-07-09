"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateMemberRestrictions } from "@/lib/actions/team";
import type { MemberProfile } from "@/lib/queries/members";

interface MemberRestrictionsRowProps {
  member: MemberProfile;
  sendingDomain: string | null;
}

export function MemberRestrictionsRow({
  member,
  sendingDomain,
}: MemberRestrictionsRowProps) {
  const [leadVisibility, setLeadVisibility] = useState(member.leadVisibility);
  const [jobFunction, setJobFunction] = useState(member.jobFunction ?? "");
  const [maxOpenLeads, setMaxOpenLeads] = useState(
    member.maxOpenLeads != null ? String(member.maxOpenLeads) : "",
  );
  const [fromDisplayName, setFromDisplayName] = useState(
    member.fromDisplayName ?? "",
  );
  const [fromEmailLocalPart, setFromEmailLocalPart] = useState(
    member.fromEmailLocalPart ?? "",
  );
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateMemberRestrictions(member.userId, {
        leadVisibility: leadVisibility as "all" | "assigned_only",
        maxOpenLeads,
        fromDisplayName,
        fromEmailLocalPart,
        jobFunction: jobFunction as
          | "cold_caller"
          | "lead_manager"
          | "acquisitions_manager"
          | "",
      });
      toast.success("Member settings saved");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save settings",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <TableRow>
      <TableCell className="py-4">
        <div className="flex flex-col gap-0.5">
          <span>{member.email}</span>
          {fromDisplayName && (
            <span className="text-xs text-muted-foreground">
              Sends as {fromDisplayName}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="py-4">
        <Badge variant="secondary">{member.role}</Badge>
      </TableCell>
      <TableCell className="py-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Job function</span>
          <Select
            value={jobFunction || "__none__"}
            onValueChange={(value) =>
              value && setJobFunction(value === "__none__" ? "" : value)
            }
          >
            <SelectTrigger size="sm" className="w-44">
              <SelectValue>
                {(value: string) =>
                  ({
                    __none__: "—",
                    cold_caller: "Cold caller",
                    lead_manager: "Lead manager",
                    acquisitions_manager: "Acquisitions manager",
                  })[value] ?? "—"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              <SelectItem value="cold_caller">Cold caller</SelectItem>
              <SelectItem value="lead_manager">Lead manager</SelectItem>
              <SelectItem value="acquisitions_manager">
                Acquisitions manager
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </TableCell>
      <TableCell className="py-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Visibility</span>
          <Select
            value={leadVisibility}
            onValueChange={(value) => value && setLeadVisibility(value)}
          >
            <SelectTrigger size="sm" className="w-40">
              <SelectValue>
                {(value: string) =>
                  value === "assigned_only" ? "Assigned only" : "All leads"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All leads</SelectItem>
              <SelectItem value="assigned_only">Assigned only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </TableCell>
      <TableCell className="py-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Max open</span>
          <Input
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="Unlimited"
            className="w-28"
            value={maxOpenLeads}
            onChange={(e) => setMaxOpenLeads(e.target.value)}
          />
        </div>
      </TableCell>
      <TableCell className="py-4">
        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted-foreground">Sender identity</span>
          <Input
            placeholder="Display name"
            className="w-36"
            value={fromDisplayName}
            onChange={(e) => setFromDisplayName(e.target.value)}
          />
          {sendingDomain && (
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
              <Input
                placeholder="local-part"
                className="w-24"
                value={fromEmailLocalPart}
                onChange={(e) => setFromEmailLocalPart(e.target.value)}
              />
              <span className="text-xs text-muted-foreground">
                @{sendingDomain}
              </span>
            </div>
          )}
        </div>
      </TableCell>
      <TableCell className="py-4">
        <Button size="sm" className="w-fit" disabled={saving} onClick={handleSave}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </TableCell>
    </TableRow>
  );
}
