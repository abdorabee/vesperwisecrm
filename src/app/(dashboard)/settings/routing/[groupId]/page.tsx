import { notFound } from "next/navigation";
import { requireSettingsAdmin } from "@/lib/settings-access";
import { getAccountMemberProfiles } from "@/lib/queries/members";
import { getGroupDetail } from "@/lib/queries/groups";
import { SettingsPageHeader } from "@/components/settings/settings-primitives";
import { GroupForm } from "../../../team/groups/_components/group-form";

export default async function RoutingGroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  await requireSettingsAdmin();
  const { groupId } = await params;
  const [group, members] = await Promise.all([getGroupDetail(groupId), getAccountMemberProfiles()]);
  if (!group) notFound();
  const weights = Object.fromEntries(group.members.map((member) => [member.userId, member.weight]));
  return <div><SettingsPageHeader eyebrow="Lead routing" title={group.name} description="Adjust team participation and distribution weights for this group." /><div className="pt-7"><GroupForm groupId={group.id} initialName={group.name} members={members} existingWeights={weights} /></div></div>;
}
