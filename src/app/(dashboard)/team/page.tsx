import Link from "next/link";
import { requireAdminAccountId } from "@/lib/supabase/account";
import { getAccountMemberProfiles } from "@/lib/queries/members";
import { getAccountEmailSettingsForAdmin } from "@/lib/queries/account-email";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MemberRestrictionsRow } from "./_components/member-restrictions-row";
import { InviteMemberDialog } from "./_components/invite-member-dialog";

export default async function TeamPage() {
  await requireAdminAccountId();
  const [members, emailSettings] = await Promise.all([
    getAccountMemberProfiles(),
    getAccountEmailSettingsForAdmin(),
  ]);
  const sendingDomain = emailSettings?.sending_domain ?? null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Team"
        description="Restrict a member to only their assigned leads, or cap how many open leads they can hold at once, to keep the team focused."
        actions={
          <div className="flex flex-wrap gap-2">
            <InviteMemberDialog />
            <Button render={<Link href="/team/groups" />} variant="outline" nativeButton={false}>
              Routing groups
            </Button>
            <Button render={<Link href="/team/scorecard" />} nativeButton={false}>
              Employee scorecard
            </Button>
          </div>
        }
      />

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Job function</TableHead>
              <TableHead>Lead visibility</TableHead>
              <TableHead>Max open leads</TableHead>
              <TableHead>Sender identity</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <MemberRestrictionsRow
                key={member.userId}
                member={member}
                sendingDomain={sendingDomain}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
