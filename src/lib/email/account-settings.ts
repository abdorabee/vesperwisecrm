import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { Tables, TablesUpdate } from "@/lib/supabase/types";

export { formatFromAddress } from "@/lib/email/sender-identity";

export type AccountEmailSettings = Tables<"account_email_settings">;
export type DomainVerificationStatus = "pending" | "verified" | "failed";

export function mapResendDomainStatus(
  resendStatus: string,
): DomainVerificationStatus {
  if (resendStatus === "verified") {
    return "verified";
  }

  if (resendStatus === "failed" || resendStatus === "partially_failed") {
    return "failed";
  }

  return "pending";
}

export async function getAccountEmailSettings(
  accountId: string,
): Promise<AccountEmailSettings | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("account_email_settings")
    .select("*")
    .eq("account_id", accountId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function upsertAccountEmailSettings(
  accountId: string,
  values: Omit<TablesUpdate<"account_email_settings">, "account_id">,
): Promise<AccountEmailSettings> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("account_email_settings")
    .upsert(
      {
        account_id: accountId,
        ...values,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "account_id" },
    )
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to save email settings");
  }

  return data;
}

function emailDomainMatches(fromEmail: string, sendingDomain: string): boolean {
  const atIndex = fromEmail.lastIndexOf("@");
  if (atIndex === -1) {
    return false;
  }

  return fromEmail.slice(atIndex + 1).toLowerCase() === sendingDomain.toLowerCase();
}

export function isAccountEmailReady(
  settings: AccountEmailSettings | null,
): settings is AccountEmailSettings {
  if (!settings?.sending_domain || !settings.from_email?.trim()) {
    return false;
  }

  if (settings.domain_verification_status !== "verified") {
    return false;
  }

  return emailDomainMatches(settings.from_email.trim(), settings.sending_domain);
}

export function assertAccountEmailReady(
  settings: AccountEmailSettings | null,
): asserts settings is AccountEmailSettings {
  if (settings?.outbound_suspended) {
    throw new Error(
      "Outbound email is suspended for this account. Contact support if you believe this is an error.",
    );
  }

  if (!settings?.sending_domain) {
    throw new Error(
      "Email sending isn't set up yet. An account admin must configure and verify a sending domain in Settings → Email.",
    );
  }

  if (settings.domain_verification_status === "pending") {
    throw new Error(
      "Your sending domain is still pending DNS verification. Finish setup in Settings → Email.",
    );
  }

  if (settings.domain_verification_status === "failed") {
    throw new Error(
      "Domain verification failed. Check DNS records in Settings → Email.",
    );
  }

  if (!settings.from_email?.trim() || !settings.from_name?.trim()) {
    throw new Error("Set a From name and email in Settings → Email.");
  }

  if (!emailDomainMatches(settings.from_email.trim(), settings.sending_domain)) {
    throw new Error(
      `From email must use your verified domain (@${settings.sending_domain}).`,
    );
  }
}

export type EmailSetupUiState =
  | "not_started"
  | "pending_dns"
  | "verified"
  | "failed";

export function getEmailSetupUiState(
  settings: AccountEmailSettings | null,
): EmailSetupUiState {
  if (!settings?.sending_domain) {
    return "not_started";
  }

  if (settings.domain_verification_status === "verified") {
    return "verified";
  }

  if (settings.domain_verification_status === "failed") {
    return "failed";
  }

  return "pending_dns";
}
