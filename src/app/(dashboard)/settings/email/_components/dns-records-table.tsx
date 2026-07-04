"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DnsRecordRow } from "@/lib/email/resend-domains";

interface DnsRecordsTableProps {
  records: DnsRecordRow[];
}

function formatStatus(status: string): string {
  return status.replaceAll("_", " ");
}

function statusVariant(status: string): "default" | "secondary" | "outline" {
  if (status === "verified") {
    return "default";
  }

  if (status === "recommended") {
    return "outline";
  }

  return "secondary";
}

function DnsValue({
  label,
  value,
  copyKey,
  copiedKey,
  onCopy,
}: {
  label: string;
  value: string;
  copyKey: string;
  copiedKey: string | null;
  onCopy: (key: string, value: string, label: string) => void;
}) {
  const copied = copiedKey === copyKey;

  return (
    <div className="group/value flex min-w-0 items-center gap-2">
      <code
        title={value}
        className="min-w-0 flex-1 truncate rounded-md border border-border/70 bg-muted/35 px-2.5 py-1.5 font-mono text-[0.72rem] leading-5 text-foreground/90 shadow-inner shadow-black/10 transition-colors group-hover/value:border-foreground/20"
      >
        {value}
      </code>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Copy ${label}`}
        title={`Copy ${label}`}
        className="shrink-0 border border-border/70 bg-background/70 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
        onClick={() => onCopy(copyKey, value, label)}
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </Button>
    </div>
  );
}

export function DnsRecordsTable({ records }: DnsRecordsTableProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (records.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No DNS records available yet. Register a domain to see required records.
      </p>
    );
  }

  async function copyRecordValue(key: string, value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      toast.success(`${label} copied`);
      window.setTimeout(() => setCopiedKey(null), 1600);
    } catch {
      toast.error("Could not copy value");
    }
  }

  return (
    <div className="rounded-lg border bg-card/30 ring-1 ring-foreground/10">
      <Table className="min-w-[980px] table-fixed">
        <colgroup>
          <col className="w-[10%]" />
          <col className="w-[8%]" />
          <col className="w-[24%]" />
          <col className="w-[43%]" />
          <col className="w-[15%]" />
        </colgroup>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="bg-card/95 px-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Record
            </TableHead>
            <TableHead className="bg-card/95 px-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Type
            </TableHead>
            <TableHead className="bg-card/95 px-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Name
            </TableHead>
            <TableHead className="bg-card/95 px-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Value
            </TableHead>
            <TableHead className="bg-card/95 px-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Status
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record, index) => {
            const rowKey = `${record.record}-${record.name}-${record.type}`;

            return (
              <TableRow
                key={rowKey}
                className="group/row hover:bg-foreground/[0.03]"
              >
                <TableCell className="px-3 py-3.5 align-middle">
                  <span className="font-medium text-foreground">
                    {record.record}
                  </span>
                </TableCell>
                <TableCell className="px-3 py-3.5 align-middle">
                  <Badge variant="outline" className="font-mono">
                    {record.type}
                  </Badge>
                </TableCell>
                <TableCell className="min-w-0 px-3 py-3.5 align-middle">
                  <DnsValue
                    label={`${record.record} name`}
                    value={record.name}
                    copyKey={`${rowKey}-name-${index}`}
                    copiedKey={copiedKey}
                    onCopy={copyRecordValue}
                  />
                </TableCell>
                <TableCell className="min-w-0 px-3 py-3.5 align-middle">
                  <DnsValue
                    label={`${record.record} value`}
                    value={record.value}
                    copyKey={`${rowKey}-value-${index}`}
                    copiedKey={copiedKey}
                    onCopy={copyRecordValue}
                  />
                </TableCell>
                <TableCell className="px-3 py-3.5 align-middle">
                  <Badge
                    variant={statusVariant(record.status)}
                    className="capitalize"
                  >
                    {formatStatus(record.status)}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
