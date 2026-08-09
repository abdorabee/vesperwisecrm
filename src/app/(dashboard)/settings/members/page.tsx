import Link from "next/link";
import { requireSettingsAdmin } from "@/lib/settings-access";
import { getAccountMemberProfiles, getPendingInvites } from "@/lib/queries/members";
import { getAccountEmailSettingsForAdmin } from "@/lib/queries/account-email";
import { getTvDisplayTokensForAdmin } from "@/lib/queries/tv";
import { SettingsPageHeader, SettingsSection } from "@/components/settings/settings-primitives";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MemberRestrictionsRow } from "../../team/_components/member-restrictions-row";
import { InviteMemberDialog } from "../../team/_components/invite-member-dialog";
import { TvDisplayPanel } from "../../team/_components/tv-display-panel";
import { PendingInvites } from "./_components/pending-invites";

export default async function MembersSettingsPage() {
  await requireSettingsAdmin();
  const [members, invites, emailSettings, tvTokens] = await Promise.all([
    getAccountMemberProfiles(),
    getPendingInvites(),
    getAccountEmailSettingsForAdmin(),
    getTvDisplayTokensForAdmin(),
  ]);
  return (
    <div>
      <SettingsPageHeader eyebrow="Workspace" title="Members" description="Invite teammates and control how they access and work assigned leads." />
      <SettingsSection title="People" description="Member roles cannot be changed in this release. Lead access controls remain available per member.">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <InviteMemberDialog />
            <Button render={<Link href="/settings/routing" />} variant="outline" nativeButton={false}>Lead routing</Button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader><TableRow><TableHead>Member</TableHead><TableHead>Role</TableHead><TableHead>Job function</TableHead><TableHead>Lead visibility</TableHead><TableHead>Max open leads</TableHead><TableHead>Sender identity</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>{members.map((member) => <MemberRestrictionsRow key={member.userId} member={member} sendingDomain={emailSettings?.sending_domain ?? null} />)}</TableBody>
            </Table>
          </div>
        </div>
      </SettingsSection>
      <SettingsSection title="Pending invitations" description="Invitations expire seven days after they are created.">
        <PendingInvites invites={invites} />
      </SettingsSection>
      <SettingsSection title="TV KPI access" description="Create read-only links for office displays. These links can be revoked at any time.">
        <TvDisplayPanel tokens={tvTokens} />
      </SettingsSection>
    </div>
  );
}
