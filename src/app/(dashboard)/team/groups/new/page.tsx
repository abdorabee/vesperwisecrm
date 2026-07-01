import { requireAdminAccountId } from "@/lib/supabase/account";
import { getAccountMemberProfiles } from "@/lib/queries/members";
import { GroupForm } from "../_components/group-form";

export default async function NewGroupPage() {
  await requireAdminAccountId();
  const members = await getAccountMemberProfiles();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">New group</h1>
      <GroupForm members={members} />
    </div>
  );
}
