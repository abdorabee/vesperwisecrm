import "server-only";

import { requireAccountId } from "@/lib/supabase/account";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export interface DialerCredentialStatus {
  connected: boolean;
  accountSid: string | null;
  fromNumber: string | null;
  status: "active" | "invalid" | null;
  lastVerifiedAt: string | null;
}

export async function getDialerCredentialStatus(): Promise<DialerCredentialStatus> {
  const accountId = await requireAccountId();
  const supabase = createServiceRoleClient();
  const { data: row } = await supabase
    .from("dialer_provider_credentials")
    .select("account_sid, from_number, status, last_verified_at")
    .eq("account_id", accountId)
    .maybeSingle();

  if (!row) {
    return { connected: false, accountSid: null, fromNumber: null, status: null, lastVerifiedAt: null };
  }

  return {
    connected: true,
    accountSid: row.account_sid,
    fromNumber: row.from_number,
    status: row.status as "active" | "invalid",
    lastVerifiedAt: row.last_verified_at,
  };
}
