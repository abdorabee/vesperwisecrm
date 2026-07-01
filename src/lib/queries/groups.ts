import { createClient } from "@/lib/supabase/server";
import { requireAccountId } from "@/lib/supabase/account";
import { getAccountMemberProfiles } from "@/lib/queries/members";
import type { Tables } from "@/lib/supabase/types";

export interface GroupMember {
  userId: string;
  email: string;
  weight: number;
}

export interface GroupWithMembers extends Tables<"lead_groups"> {
  members: GroupMember[];
}

export async function getGroups(): Promise<GroupWithMembers[]> {
  const accountId = await requireAccountId();
  const supabase = await createClient();

  const { data: groups, error } = await supabase
    .from("lead_groups")
    .select("*")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  if (!groups || groups.length === 0) {
    return [];
  }

  const { data: members, error: membersError } = await supabase
    .from("lead_group_members")
    .select("*")
    .in(
      "group_id",
      groups.map((g) => g.id),
    );

  if (membersError) {
    throw new Error(membersError.message);
  }

  const profiles = await getAccountMemberProfiles();
  const emailByUserId = new Map(profiles.map((p) => [p.userId, p.email]));

  return groups.map((group) => ({
    ...group,
    members: (members ?? [])
      .filter((m) => m.group_id === group.id)
      .map((m) => ({
        userId: m.user_id,
        email: emailByUserId.get(m.user_id) ?? m.user_id,
        weight: m.weight,
      })),
  }));
}

export async function getGroupDetail(
  groupId: string,
): Promise<GroupWithMembers | null> {
  const groups = await getGroups();
  return groups.find((g) => g.id === groupId) ?? null;
}
