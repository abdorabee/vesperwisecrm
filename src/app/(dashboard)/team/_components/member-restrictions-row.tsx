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
}

export function MemberRestrictionsRow({ member }: MemberRestrictionsRowProps) {
  const [leadVisibility, setLeadVisibility] = useState(member.leadVisibility);
  const [maxOpenLeads, setMaxOpenLeads] = useState(
    member.maxOpenLeads != null ? String(member.maxOpenLeads) : "",
  );
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateMemberRestrictions(member.userId, {
        leadVisibility: leadVisibility as "all" | "assigned_only",
        maxOpenLeads,
      });
      toast.success("Restrictions saved");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save restrictions",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <TableRow>
      <TableCell>{member.email}</TableCell>
      <TableCell>
        <Badge variant="secondary">{member.role}</Badge>
      </TableCell>
      <TableCell>
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
      </TableCell>
      <TableCell>
        <Input
          type="number"
          min={0}
          inputMode="numeric"
          placeholder="Unlimited"
          className="w-28"
          value={maxOpenLeads}
          onChange={(e) => setMaxOpenLeads(e.target.value)}
        />
      </TableCell>
      <TableCell>
        <Button size="sm" disabled={saving} onClick={handleSave}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </TableCell>
    </TableRow>
  );
}
