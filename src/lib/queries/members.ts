import { createClient } from "@/lib/supabase/server";
import { getSessionMembership, requireAccountId } from "@/lib/supabase/account";

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

export interface CurrentMembership {
  accountId: string;
  role: string;
  onboardingTourCompletedAt: string | null;
}

export interface PendingInvite {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  expiresAt: string;
}

export async function getPendingInvites(): Promise<PendingInvite[]> {
  const accountId = await requireAccountId();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invites")
    .select("id, email, role, created_at, expires_at")
    .eq("account_id", accountId)
    .is("redeemed_at", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((invite) => ({
    id: invite.id,
    email: invite.email,
    role: invite.role,
    createdAt: invite.created_at,
    expiresAt: invite.expires_at,
  }));
}

export async function getCurrentMembership(): Promise<CurrentMembership | null> {
  const membership = await getSessionMembership();
  if (!membership) {
    return null;
  }

  return {
    accountId: membership.accountId,
    role: membership.role,
    onboardingTourCompletedAt: membership.onboardingTourCompletedAt,
  };
}

export function isAdminRole(role: string): boolean {
  return role === "owner" || role === "admin";
}
