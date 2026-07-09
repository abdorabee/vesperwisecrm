"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { requireAccountId, requireAdminAccountId } from "@/lib/supabase/account";
import {
  clientSchema,
  inviteClientUserSchema,
  type ClientFormInput,
  type InviteClientUserInput,
} from "@/lib/validations/client";
import {
  canSendBrandedAuthEmail,
  sendClientPortalInvitationEmail,
} from "@/lib/email/auth-emails";

function optionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

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

export async function saveClient(
  input: ClientFormInput,
  clientId?: string,
): Promise<{ clientId: string }> {
  const data = clientSchema.parse(input);
  const accountId = await requireAdminAccountId();
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

  const inviteMetadata = {
    invited_account_id: accountId,
    invited_role: "client",
    invited_client_id: clientId,
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

  const brandedInviteLink = canSendBrandedAuthEmail()
    ? getGeneratedActionLink(invited)
    : null;

  const { error: memberError } = await serviceRole
    .from("account_members")
    .upsert(
      {
        account_id: accountId,
        user_id: invitedUserId,
        role: "client",
        client_id: clientId,
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

    await sendClientPortalInvitationEmail({
      to: data.email,
      actionLink: brandedInviteLink,
      accountName: account.name,
    });
  }

  revalidatePath(`/team/clients/${clientId}`);
}

export async function assignLeadToClient(
  leadId: string,
  clientId: string | null,
): Promise<void> {
  const accountId = await requireAccountId();
  const supabase = await createClient();

  const { error } = await supabase
    .from("leads")
    .update({
      client_id: clientId,
      client_interest_status: clientId ? "pending" : null,
      client_decided_at: null,
    })
    .eq("id", leadId)
    .eq("account_id", accountId);

  if (error) {
    throw new Error(error.message);
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
