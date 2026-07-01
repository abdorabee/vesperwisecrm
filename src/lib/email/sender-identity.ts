import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { AccountEmailSettings } from "@/lib/email/account-settings";

export interface MemberSenderIdentity {
  fromDisplayName: string | null;
  fromEmailLocalPart: string | null;
}

export async function getMemberSenderIdentity(
  accountId: string,
  userId: string,
): Promise<MemberSenderIdentity | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("account_members")
    .select("from_display_name, from_email_local_part")
    .eq("account_id", accountId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    fromDisplayName: data.from_display_name,
    fromEmailLocalPart: data.from_email_local_part,
  };
}

export function formatFromAddress(
  settings: AccountEmailSettings,
  member?: MemberSenderIdentity | null,
): string {
  const accountEmail = settings.from_email?.trim();
  const accountName = settings.from_name?.trim();
  const domain = settings.sending_domain?.trim();

  if (!accountEmail || !domain) {
    throw new Error("From email is required");
  }

  const localPart = member?.fromEmailLocalPart?.trim().toLowerCase();
  const displayName = member?.fromDisplayName?.trim();
  const email = localPart ? `${localPart}@${domain}` : accountEmail;

  if (displayName && localPart) {
    return `${displayName} <${email}>`;
  }

  if (displayName && accountName) {
    return `${displayName} via ${accountName} <${email}>`;
  }

  if (accountName) {
    return `${accountName} <${email}>`;
  }

  return email;
}
