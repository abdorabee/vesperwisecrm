import { createClient } from "@/lib/supabase/server";
import { requireAdminAccountId } from "@/lib/supabase/account";
import {
  getAccountEmailSettings,
  upsertAccountEmailSettings,
  type AccountEmailSettings,
  type DomainVerificationStatus,
} from "@/lib/email/account-settings";
import {
  getSendingDomain,
  type SendingDomainDetails,
} from "@/lib/email/resend-domains";

export async function getAccountEmailSettingsForAdmin(): Promise<AccountEmailSettings | null> {
  const accountId = await requireAdminAccountId();
  const supabase = await createClient();

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

export interface AdminEmailSettingsWithDomain {
  settings: AccountEmailSettings | null;
  domain: SendingDomainDetails | null;
}

function requiredDnsRecordsAreVerified(
  domain: SendingDomainDetails,
): boolean {
  const requiredRecords = domain.records.filter(
    (record) => record.record === "SPF" || record.record === "DKIM",
  );

  return (
    requiredRecords.length > 0 &&
    requiredRecords.every((record) => record.status === "verified")
  );
}

function resolveLiveDomainStatus(
  domain: SendingDomainDetails,
): DomainVerificationStatus {
  if (domain.status === "verified" || requiredDnsRecordsAreVerified(domain)) {
    return "verified";
  }

  return domain.status;
}

export async function getAccountEmailSettingsWithDomainForAdmin(): Promise<AdminEmailSettingsWithDomain> {
  const accountId = await requireAdminAccountId();
  const settings = await getAccountEmailSettings(accountId);

  if (!settings?.resend_domain_id) {
    return { settings, domain: null };
  }

  let domain: SendingDomainDetails;
  try {
    domain = await getSendingDomain(settings.resend_domain_id);
  } catch {
    return { settings, domain: null };
  }

  const liveStatus = resolveLiveDomainStatus(domain);

  if (settings.domain_verification_status === liveStatus) {
    return { settings, domain };
  }

  const refreshedSettings = await upsertAccountEmailSettings(accountId, {
    domain_verification_status: liveStatus,
  });

  return { settings: refreshedSettings, domain };
}
