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

export function DnsRecordsTable({ records }: DnsRecordsTableProps) {
  if (records.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No DNS records available yet. Register a domain to see required records.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Record</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Value</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.map((record) => (
          <TableRow key={`${record.record}-${record.name}-${record.type}`}>
            <TableCell className="font-medium">{record.record}</TableCell>
            <TableCell>{record.type}</TableCell>
            <TableCell className="max-w-[200px] break-all font-mono text-xs">
              {record.name}
            </TableCell>
            <TableCell className="max-w-[280px] break-all font-mono text-xs">
              {record.value}
            </TableCell>
            <TableCell className="capitalize">{record.status.replace("_", " ")}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
