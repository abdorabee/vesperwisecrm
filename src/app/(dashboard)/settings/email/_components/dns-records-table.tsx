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
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky top-0 bg-card">Record</TableHead>
            <TableHead className="sticky top-0 bg-card">Type</TableHead>
            <TableHead className="sticky top-0 bg-card">Name</TableHead>
            <TableHead className="sticky top-0 bg-card">Value</TableHead>
            <TableHead className="sticky top-0 bg-card">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => (
            <TableRow key={`${record.record}-${record.name}-${record.type}`}>
              <TableCell className="py-3 font-medium">{record.record}</TableCell>
              <TableCell className="py-3 tabular-nums">{record.type}</TableCell>
              <TableCell className="max-w-[200px] py-3 break-all font-mono text-xs">
                {record.name}
              </TableCell>
              <TableCell className="max-w-[280px] py-3 break-all font-mono text-xs">
                {record.value}
              </TableCell>
              <TableCell className="py-3 capitalize">
                {record.status.replace("_", " ")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
