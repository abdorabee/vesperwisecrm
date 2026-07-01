"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId } from "@/lib/supabase/account";
import { groupSchema, type GroupInput } from "@/lib/validations/group";

export async function saveGroup(
  input: GroupInput,
  groupId?: string,
): Promise<{ groupId: string }> {
  const data = groupSchema.parse(input);
  const accountId = await requireAccountId();
  const supabase = await createClient();

  let id = groupId;

  if (id) {
    const { error } = await supabase
      .from("lead_groups")
      .update({ name: data.name })
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    const { error: deleteError } = await supabase
      .from("lead_group_members")
      .delete()
      .eq("group_id", id);

    if (deleteError) {
      throw new Error(deleteError.message);
    }
  } else {
    const { data: group, error } = await supabase
      .from("lead_groups")
      .insert({ account_id: accountId, name: data.name })
      .select("id")
      .single();

    if (error || !group) {
      throw new Error(error?.message ?? "Failed to create group");
    }
    id = group.id;
  }

  if (data.members.length > 0) {
    const { error: membersError } = await supabase
      .from("lead_group_members")
      .insert(
        data.members.map((member) => ({
          group_id: id!,
          account_id: accountId,
          user_id: member.userId,
          weight: Number(member.weight),
        })),
      );

    if (membersError) {
      throw new Error(membersError.message);
    }
  }

  revalidatePath("/team/groups");

  return { groupId: id! };
}

export async function deleteGroup(groupId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("lead_groups").delete().eq("id", groupId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/team/groups");
}

export async function assignLeadToGroup(
  leadId: string,
  groupId: string,
): Promise<{ assignedUserId: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("assign_lead_round_robin", {
    p_lead_id: leadId,
    p_group_id: groupId,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/pipeline");
  revalidatePath(`/leads/${leadId}`);

  return { assignedUserId: data ?? null };
}

export async function manualAssignLead(
  leadId: string,
  userId: string | null,
): Promise<void> {
  const accountId = await requireAccountId();
  const supabase = await createClient();

  if (userId) {
    const { data: member } = await supabase
      .from("account_members")
      .select("max_open_leads")
      .eq("account_id", accountId)
      .eq("user_id", userId)
      .maybeSingle();

    if (member?.max_open_leads != null) {
      const { count } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("account_id", accountId)
        .eq("owner_user_id", userId)
        .eq("status", "open")
        .is("deleted_at", null);

      if ((count ?? 0) >= member.max_open_leads) {
        throw new Error("This team member is at their open-lead cap");
      }
    }
  }

  const { error } = await supabase
    .from("leads")
    .update({ owner_user_id: userId })
    .eq("id", leadId);

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("activities").insert({
    account_id: accountId,
    lead_id: leadId,
    type: userId ? "lead_assigned" : "lead_unassigned",
    payload: userId ? { user_id: userId } : {},
  });

  revalidatePath("/pipeline");
  revalidatePath(`/leads/${leadId}`);
}

export async function releaseLead(leadId: string): Promise<void> {
  await manualAssignLead(leadId, null);
}
