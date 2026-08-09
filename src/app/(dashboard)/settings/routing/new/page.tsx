import { requireSettingsAdmin } from "@/lib/settings-access";
import { getAccountMemberProfiles } from "@/lib/queries/members";
import { SettingsPageHeader } from "@/components/settings/settings-primitives";
import { GroupForm } from "../../../team/groups/_components/group-form";

export default async function NewRoutingGroupPage() {
  await requireSettingsAdmin();
  const members = await getAccountMemberProfiles();
  return <div><SettingsPageHeader eyebrow="Lead routing" title="New routing group" description="Choose who receives leads and how heavily each teammate is weighted." /><div className="pt-7"><GroupForm members={members} /></div></div>;
}
