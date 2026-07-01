import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { requirePlatformAdmin } from "@/lib/supabase/platform-admin";
import { getPlatformAccountEmailOverview } from "@/lib/queries/platform-email";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        title="Platform email overview"
        description="Cross-account email metadata only. No lead or contact content is shown."
      />

      <Card>
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
          <CardDescription>
            {rows.length === 0
              ? "No accounts with email configuration yet."
              : `${rows.length} account${rows.length === 1 ? "" : "s"} with email settings`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No email data to display.
            </p>
          ) : (
            <div className="overflow-x-auto">
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
            </div>
          )}
        </CardContent>
      </Card>

      <Button
        render={<Link href="/pipeline" />}
        variant="link"
        className="w-fit px-0"
        nativeButton={false}
      >
        <ArrowLeft className="size-4" />
        Back to CRM
      </Button>
    </div>
  );
}
