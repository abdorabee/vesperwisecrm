"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  requireAccountId,
  requireAdminAccountId,
  requireUserId,
} from "@/lib/supabase/account";
import { requireWritableBilling } from "@/lib/billing/access";
import {
  clientSchema,
  inviteClientUserSchema,
  type ClientFormInput,
  type InviteClientUserInput,
} from "@/lib/validations/client";
import { hashInviteAuthToken } from "@/lib/auth/invite-token";
import {
  buildVerificationLink,
  canSendBrandedAuthEmail,
  getGeneratedTokenHash,
  sendClientPortalInvitationEmail,
} from "@/lib/email/auth-emails";

function optionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function saveClient(
  input: ClientFormInput,
  clientId?: string,
): Promise<{ clientId: string }> {
  const data = clientSchema.parse(input);
  const accountId = await requireAdminAccountId();
  await requireWritableBilling(accountId);
  const supabase = await createClient();

  if (clientId) {
    const { error } = await supabase
      .from("clients")
      .update({
        name: data.name,
        contact_email: optionalText(data.contactEmail),
        contact_phone: optionalText(data.contactPhone),
        notes: optionalText(data.notes),
        drive_folder_id: optionalText(data.driveFolderId),
        updated_at: new Date().toISOString(),
      })
      .eq("id", clientId)
      .eq("account_id", accountId);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/team/clients");
    revalidatePath(`/team/clients/${clientId}`);

    return { clientId };
  }

  const { data: client, error } = await supabase
    .from("clients")
    .insert({
      account_id: accountId,
      name: data.name,
      contact_email: optionalText(data.contactEmail),
      contact_phone: optionalText(data.contactPhone),
      notes: optionalText(data.notes),
    })
    .select("id")
    .single();

  if (error || !client) {
    throw new Error(error?.message ?? "Failed to create client");
  }

  revalidatePath("/team/clients");

  return { clientId: client.id };
}

export async function inviteClientUser(
  clientId: string,
  input: InviteClientUserInput,
): Promise<void> {
  const data = inviteClientUserSchema.parse(input);
  const accountId = await requireAdminAccountId();
  await requireWritableBilling(accountId);
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

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, name")
    .eq("id", clientId)
    .eq("account_id", accountId)
    .single();

  if (clientError || !client) {
    throw new Error(clientError?.message ?? "Client not found");
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    "http://localhost:3000";
  const redirectTo = siteUrl.startsWith("http")
    ? `${siteUrl}/auth/callback`
    : `https://${siteUrl}/auth/callback`;

  if (!canSendBrandedAuthEmail()) {
    throw new Error("Invite email is not configured.");
  }

  const { data: inviteRow, error: inviteRecordError } = await serviceRole
    .from("invites")
    .insert({
      account_id: accountId,
      email: data.email,
      role: "client",
      client_id: clientId,
      invited_by: invitedBy,
    })
    .select("id")
    .single();

  if (inviteRecordError || !inviteRow) {
    throw new Error(inviteRecordError?.message ?? "Could not create invite");
  }

  const { data: invited, error: inviteError } =
    await serviceRole.auth.admin.generateLink({
      type: "invite",
      email: data.email,
      options: {
        redirectTo,
        data: { account_name: account.name },
      },
    });

  const tokenHash = getGeneratedTokenHash(invited);
  if (inviteError || !tokenHash) {
    await serviceRole.from("invites").delete().eq("id", inviteRow.id);
    throw new Error(inviteError?.message ?? "Invite did not return a token hash");
  }

  const { error: bindError } = await serviceRole
    .from("invites")
    .update({ auth_token_hash: hashInviteAuthToken(tokenHash) })
    .eq("id", inviteRow.id);
  if (bindError) {
    throw new Error(bindError.message);
  }

  await sendClientPortalInvitationEmail({
    to: data.email,
    actionLink: buildVerificationLink(redirectTo, tokenHash, "invite"),
    accountName: account.name,
  });

  revalidatePath(`/team/clients/${clientId}`);
}

export async function assignLeadToClient(
  leadId: string,
  clientId: string | null,
): Promise<void> {
  const accountId = await requireAccountId();
  await requireWritableBilling(accountId);
  const supabase = await createClient();

  if (clientId) {
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .eq("id", clientId)
      .eq("account_id", accountId)
      .maybeSingle();
    if (clientError || !client) {
      throw new Error(clientError?.message ?? "Client not found");
    }
  }

  const { data: updated, error } = await supabase
    .from("leads")
    .update({
      client_id: clientId,
      client_interest_status: clientId ? "pending" : null,
      client_decided_at: null,
    })
    .eq("id", leadId)
    .eq("account_id", accountId)
    .select("id");

  if (error) {
    throw new Error(error.message);
  }
  if (!updated?.length) {
    throw new Error("Lead not found");
  }

  await supabase.from("activities").insert({
    account_id: accountId,
    lead_id: leadId,
    type: "client_assigned",
    payload: { client_id: clientId },
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/pipeline");
}
