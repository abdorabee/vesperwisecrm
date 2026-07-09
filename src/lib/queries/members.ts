import { createClient } from "@/lib/supabase/server";
import { requireAccountId } from "@/lib/supabase/account";

export interface MemberProfile {
  userId: string;
  email: string;
  role: string;
  leadVisibility: string;
  maxOpenLeads: number | null;
  fromDisplayName: string | null;
  fromEmailLocalPart: string | null;
  jobFunction: string | null;
}

export async function getAccountMemberProfiles(): Promise<MemberProfile[]> {
  const accountId = await requireAccountId();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_account_member_profiles", {
    p_account_id: accountId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    userId: row.user_id,
    email: row.email,
    role: row.role,
    leadVisibility: row.lead_visibility,
    maxOpenLeads: row.max_open_leads,
    fromDisplayName: row.from_display_name ?? null,
    fromEmailLocalPart: row.from_email_local_part ?? null,
    jobFunction: row.job_function ?? null,
  }));
}

export async function getOwnSenderIdentity(): Promise<{
  fromDisplayName: string | null;
  fromEmailLocalPart: string | null;
  sendingDomain: string | null;
}> {
  const accountId = await requireAccountId();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data: member, error: memberError } = await supabase
    .from("account_members")
    .select("from_display_name, from_email_local_part")
    .eq("account_id", accountId)
    .eq("user_id", user.id)
    .single();

  if (memberError) {
    throw new Error(memberError.message);
  }

  const { data: emailSettings } = await supabase
    .from("account_email_settings")
    .select("sending_domain")
    .eq("account_id", accountId)
    .maybeSingle();

  return {
    fromDisplayName: member.from_display_name,
    fromEmailLocalPart: member.from_email_local_part,
    sendingDomain: emailSettings?.sending_domain ?? null,
  };
}

export interface CurrentMembership {
  accountId: string;
  role: string;
}

export async function getCurrentMembership(): Promise<CurrentMembership | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("account_members")
    .select("account_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return { accountId: data.account_id, role: data.role };
}

export function isAdminRole(role: string): boolean {
  return role === "owner" || role === "admin";
}
