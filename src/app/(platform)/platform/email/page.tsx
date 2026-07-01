import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/supabase/platform-admin";
import { getPlatformAccountEmailOverview } from "@/lib/queries/platform-email";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlatformAccountRow } from "./_components/platform-account-row";

export default async function PlatformEmailPage() {
  await requirePlatformAdmin();
  const rows = await getPlatformAccountEmailOverview();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Platform email overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cross-account email metadata only. No lead or contact content is shown.
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Account</TableHead>
            <TableHead>Domain</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Sent (30d)</TableHead>
            <TableHead>Bounces (30d)</TableHead>
            <TableHead>Complaints (30d)</TableHead>
            <TableHead>Outbound</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <PlatformAccountRow key={row.accountId} row={row} />
          ))}
        </TableBody>
      </Table>

      <p className="text-sm text-muted-foreground">
        <Link href="/pipeline" className="underline">
          Back to CRM
        </Link>
      </p>
    </div>
  );
}
