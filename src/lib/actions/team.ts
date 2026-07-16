"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { requireAdminAccountId, requireAccountId, requireUserId } from "@/lib/supabase/account";
import {
  inviteTeamMemberSchema,
  updateMemberRestrictionsSchema,
  type InviteTeamMemberInput,
  type UpdateMemberRestrictionsInput,
} from "@/lib/validations/team";
import {
  memberSenderIdentitySchema,
  type MemberSenderIdentityInput,
} from "@/lib/validations/account-email";
import {
  canSendBrandedAuthEmail,
  sendTeamInvitationEmail,
} from "@/lib/email/auth-emails";

function getGeneratedActionLink(value: unknown): string | null {
  if (!value || typeof value !== "object" || !("properties" in value)) {
    return null;
  }

  const properties = (value as { properties?: { action_link?: unknown } })
    .properties;
  return typeof properties?.action_link === "string"
    ? properties.action_link
    : null;
}

export async function updateMemberRestrictions(
  userId: string,
  input: UpdateMemberRestrictionsInput,
): Promise<void> {
  const data = updateMemberRestrictionsSchema.parse(input);
  const accountId = await requireAdminAccountId();
  const supabase = await createClient();

  const { error } = await supabase
    .from("account_members")
    .update({
      lead_visibility: data.leadVisibility,
      max_open_leads: data.maxOpenLeads ? Number(data.maxOpenLeads) : null,
      from_display_name: data.fromDisplayName?.trim() || null,
      from_email_local_part: data.fromEmailLocalPart?.trim() || null,
      job_function: data.jobFunction || null,
    })
    .eq("account_id", accountId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/team");
}

export async function inviteTeamMember(
  input: InviteTeamMemberInput,
): Promise<void> {
  const data = inviteTeamMemberSchema.parse(input);
  const accountId = await requireAdminAccountId();
  const invitedBy = await requireUserId();
  const supabase = await createClient();
  const serviceRole = createServiceRoleClient();

  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("name")
    .eq("id", accountId)
    .single();

  if (accountError || !account) {
    throw new Error(accountError?.message ?? "Account not found");
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    "http://localhost:3000";
  const redirectTo = siteUrl.startsWith("http")
    ? `${siteUrl}/auth/callback`
    : `https://${siteUrl}/auth/callback`;

  // The signup trigger grants membership only from this server-issued
  // invite row -- signup metadata is never trusted for membership.
  const { error: inviteRecordError } = await serviceRole
    .from("invites")
    .insert({
      account_id: accountId,
      email: data.email,
      role: data.role,
      invited_by: invitedBy,
    });

  if (inviteRecordError) {
    throw new Error(inviteRecordError.message);
  }

  const inviteMetadata = {
    account_name: account.name,
  };

  const { data: invited, error: inviteError } = canSendBrandedAuthEmail()
    ? await serviceRole.auth.admin.generateLink({
        type: "invite",
        email: data.email,
        options: {
          redirectTo,
          data: inviteMetadata,
        },
      })
    : await serviceRole.auth.admin.inviteUserByEmail(data.email, {
        redirectTo,
        data: inviteMetadata,
      });

  if (inviteError) {
    throw new Error(inviteError.message);
  }

  const invitedUserId = invited.user?.id;
  if (!invitedUserId) {
    throw new Error("Invite did not return a user");
  }

  const brandedInviteLink =
    canSendBrandedAuthEmail() ? getGeneratedActionLink(invited) : null;

  const { error: memberError } = await serviceRole
    .from("account_members")
    .upsert(
      {
        account_id: accountId,
        user_id: invitedUserId,
        role: data.role,
      },
      { onConflict: "account_id,user_id" },
    );

  if (memberError) {
    throw new Error(memberError.message);
  }

  if (canSendBrandedAuthEmail()) {
    if (!brandedInviteLink) {
      throw new Error("Invite did not return an action link");
    }

    await sendTeamInvitationEmail({
      to: data.email,
      actionLink: brandedInviteLink,
      accountName: account.name,
    });
  }

  revalidatePath("/team");
}

export async function updateOwnSenderIdentity(
  input: MemberSenderIdentityInput,
): Promise<void> {
  const data = memberSenderIdentitySchema.parse(input);
  const accountId = await requireAccountId();
  const userId = await requireUserId();
  const supabase = await createClient();

  const { error } = await supabase
    .from("account_members")
    .update({
      from_display_name: data.fromDisplayName?.trim() || null,
      from_email_local_part: data.fromEmailLocalPart?.trim() || null,
    })
    .eq("account_id", accountId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/scorecard");
  revalidatePath("/settings/profile");
}
