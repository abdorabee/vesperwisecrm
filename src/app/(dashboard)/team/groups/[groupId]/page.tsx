import { notFound } from "next/navigation";
import { requireAdminAccountId } from "@/lib/supabase/account";
import { getAccountMemberProfiles } from "@/lib/queries/members";
import { getGroupDetail } from "@/lib/queries/groups";
import { GroupForm } from "../_components/group-form";

interface GroupDetailPageProps {
  params: Promise<{ groupId: string }>;
}

export default async function GroupDetailPage({
  params,
}: GroupDetailPageProps) {
  await requireAdminAccountId();
  const { groupId } = await params;
  const [group, members] = await Promise.all([
    getGroupDetail(groupId),
    getAccountMemberProfiles(),
  ]);

  if (!group) {
    notFound();
  }

  const existingWeights = Object.fromEntries(
    group.members.map((member) => [member.userId, member.weight]),
  );

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{group.name}</h1>
      <GroupForm
        groupId={group.id}
        initialName={group.name}
        members={members}
        existingWeights={existingWeights}
      />
    </div>
  );
}
