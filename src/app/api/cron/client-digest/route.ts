import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  formatFromAddress,
  getAccountEmailSettings,
  isAccountEmailReady,
} from "@/lib/email/account-settings";
import { getResendClient } from "@/lib/resend/client";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

interface DigestLead {
  id: string;
  title: string;
  asking_price: number | null;
  condition: string | null;
}

function buildDigestText(clientName: string, leads: DigestLead[]): string {
  const lines = [
    `Hi ${clientName},`,
    "",
    `Here's what's waiting on your review (${leads.length} propert${leads.length === 1 ? "y" : "ies"}):`,
    "",
  ];

  for (const lead of leads) {
    const price =
      lead.asking_price != null
        ? `$${Number(lead.asking_price).toLocaleString()}`
        : "price TBD";
    lines.push(`- ${lead.title} — ${price}${lead.condition ? ` — ${lead.condition}` : ""}`);
  }

  lines.push("", "Log in to your portal to review details and mark your interest.");

  return lines.join("\n");
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();

  const { data: clients } = await supabase
    .from("clients")
    .select("id, account_id, name, contact_email");

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const client of clients ?? []) {
    try {
      const { data: leads } = await supabase
        .from("leads")
        .select("id, title, property:lead_properties(asking_price, condition)")
        .eq("account_id", client.account_id)
        .eq("client_id", client.id)
        .eq("client_interest_status", "pending")
        .is("deleted_at", null);

      if (!leads || leads.length === 0) {
        skipped += 1;
        continue;
      }

      const emailSettings = await getAccountEmailSettings(client.account_id);
      if (!isAccountEmailReady(emailSettings)) {
        skipped += 1;
        continue;
      }

      const { data: portalMembers } = await supabase.rpc(
        "get_client_portal_members",
        { p_account_id: client.account_id },
      );
      const recipientEmails = (portalMembers ?? [])
        .filter((member) => member.client_id === client.id)
        .map((member) => member.email);

      const to = recipientEmails.length > 0
        ? recipientEmails
        : client.contact_email
          ? [client.contact_email]
          : [];

      if (to.length === 0) {
        skipped += 1;
        continue;
      }

      const digestLeads: DigestLead[] = leads.map((lead) => {
        const property = Array.isArray(lead.property)
          ? lead.property[0]
          : lead.property;
        return {
          id: lead.id,
          title: lead.title,
          asking_price: property?.asking_price ?? null,
          condition: property?.condition ?? null,
        };
      });

      const resend = getResendClient();
      const { error } = await resend.emails.send({
        from: formatFromAddress(emailSettings),
        to,
        subject: `${digestLeads.length} propert${digestLeads.length === 1 ? "y" : "ies"} waiting on your review`,
        text: buildDigestText(client.name, digestLeads),
      });

      if (error) {
        throw new Error(error.message);
      }

      sent += 1;
    } catch {
      failed += 1;
    }
  }

  return NextResponse.json({ sent, skipped, failed });
}
