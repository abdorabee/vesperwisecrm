import { requireAdminAccountId } from "@/lib/supabase/account";
import { createClient } from "@/lib/supabase/server";

export interface EmailHealthStats {
  outbound7d: number;
  outbound30d: number;
  bounces7d: number;
  bounces30d: number;
  complaints7d: number;
  complaints30d: number;
}

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export async function getEmailHealthStats(): Promise<EmailHealthStats> {
  const accountId = await requireAdminAccountId();
  const supabase = await createClient();
  const since7d = daysAgoIso(7);
  const since30d = daysAgoIso(30);

  const [
    { count: outbound7d },
    { count: outbound30d },
    { count: bounces7d },
    { count: bounces30d },
    { count: complaints7d },
    { count: complaints30d },
  ] = await Promise.all([
    supabase
      .from("activities")
      .select("id", { count: "exact", head: true })
      .eq("account_id", accountId)
      .eq("type", "email_sent")
      .gte("created_at", since7d),
    supabase
      .from("activities")
      .select("id", { count: "exact", head: true })
      .eq("account_id", accountId)
      .eq("type", "email_sent")
      .gte("created_at", since30d),
    supabase
      .from("email_delivery_events")
      .select("id", { count: "exact", head: true })
      .eq("account_id", accountId)
      .eq("event_type", "bounced")
      .gte("created_at", since7d),
    supabase
      .from("email_delivery_events")
      .select("id", { count: "exact", head: true })
      .eq("account_id", accountId)
      .eq("event_type", "bounced")
      .gte("created_at", since30d),
    supabase
      .from("email_delivery_events")
      .select("id", { count: "exact", head: true })
      .eq("account_id", accountId)
      .eq("event_type", "complained")
      .gte("created_at", since7d),
    supabase
      .from("email_delivery_events")
      .select("id", { count: "exact", head: true })
      .eq("account_id", accountId)
      .eq("event_type", "complained")
      .gte("created_at", since30d),
  ]);

  return {
    outbound7d: outbound7d ?? 0,
    outbound30d: outbound30d ?? 0,
    bounces7d: bounces7d ?? 0,
    bounces30d: bounces30d ?? 0,
    complaints7d: complaints7d ?? 0,
    complaints30d: complaints30d ?? 0,
  };
}
