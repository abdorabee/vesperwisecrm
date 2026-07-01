import { createServiceRoleClient } from "@/lib/supabase/service-role";

export interface PlatformAccountEmailRow {
  accountId: string;
  accountName: string;
  sendingDomain: string | null;
  domainVerificationStatus: string | null;
  outboundSuspended: boolean;
  suspendedAt: string | null;
  suspendedReason: string | null;
  outbound30d: number;
  bounces30d: number;
  complaints30d: number;
}

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export async function getPlatformAccountEmailOverview(): Promise<
  PlatformAccountEmailRow[]
> {
  const supabase = createServiceRoleClient();
  const since30d = daysAgoIso(30);

  const { data: accounts, error: accountsError } = await supabase
    .from("accounts")
    .select("id, name")
    .order("name");

  if (accountsError || !accounts) {
    throw new Error(accountsError?.message ?? "Failed to load accounts");
  }

  const rows: PlatformAccountEmailRow[] = [];

  for (const account of accounts) {
    const { data: emailSettings } = await supabase
      .from("account_email_settings")
      .select(
        "sending_domain, domain_verification_status, outbound_suspended, suspended_at, suspended_reason",
      )
      .eq("account_id", account.id)
      .maybeSingle();

    const [
      { count: outbound30d },
      { count: bounces30d },
      { count: complaints30d },
    ] = await Promise.all([
      supabase
        .from("activities")
        .select("id", { count: "exact", head: true })
        .eq("account_id", account.id)
        .eq("type", "email_sent")
        .gte("created_at", since30d),
      supabase
        .from("email_delivery_events")
        .select("id", { count: "exact", head: true })
        .eq("account_id", account.id)
        .eq("event_type", "bounced")
        .gte("created_at", since30d),
      supabase
        .from("email_delivery_events")
        .select("id", { count: "exact", head: true })
        .eq("account_id", account.id)
        .eq("event_type", "complained")
        .gte("created_at", since30d),
    ]);

    rows.push({
      accountId: account.id,
      accountName: account.name,
      sendingDomain: emailSettings?.sending_domain ?? null,
      domainVerificationStatus:
        emailSettings?.domain_verification_status ?? null,
      outboundSuspended: emailSettings?.outbound_suspended ?? false,
      suspendedAt: emailSettings?.suspended_at ?? null,
      suspendedReason: emailSettings?.suspended_reason ?? null,
      outbound30d: outbound30d ?? 0,
      bounces30d: bounces30d ?? 0,
      complaints30d: complaints30d ?? 0,
    });
  }

  return rows;
}
