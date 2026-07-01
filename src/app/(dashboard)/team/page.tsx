import Link from "next/link";
import { requireAdminAccountId } from "@/lib/supabase/account";
import { getAccountMemberProfiles } from "@/lib/queries/members";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MemberRestrictionsRow } from "./_components/member-restrictions-row";

export default async function TeamPage() {
  await requireAdminAccountId();
  const members = await getAccountMemberProfiles();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Team</h1>
        <div className="flex gap-2">
          <Button render={<Link href="/team/groups" />} variant="outline" nativeButton={false}>
            Routing groups
          </Button>
          <Button render={<Link href="/team/scorecard" />} nativeButton={false}>
            Employee scorecard
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Restrict a member to only their assigned leads, or cap how many open
        leads they can hold at once, to keep the team focused.
      </p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Lead visibility</TableHead>
            <TableHead>Max open leads</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <MemberRestrictionsRow key={member.userId} member={member} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
