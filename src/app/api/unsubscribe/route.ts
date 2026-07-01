import { NextResponse } from "next/server";
import { verifyUnsubscribeToken } from "@/lib/email/compliance-footer";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

function confirmationHtml(message: string): NextResponse {
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Unsubscribe</title></head>
<body style="font-family: system-ui, sans-serif; max-width: 32rem; margin: 2rem auto;">
  <h1>Unsubscribe</h1>
  <p>${message}</p>
</body>
</html>`;
  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return confirmationHtml("Invalid unsubscribe link.");
  }

  const parsed = verifyUnsubscribeToken(token);
  if (!parsed) {
    return confirmationHtml("This unsubscribe link is invalid or has expired.");
  }

  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();

  const { error: contactError } = await supabase
    .from("contacts")
    .update({ email_opted_out_at: now })
    .eq("id", parsed.contactId)
    .eq("account_id", parsed.accountId);

  if (contactError) {
    return confirmationHtml("We could not process your unsubscribe request.");
  }

  const { data: leads } = await supabase
    .from("leads")
    .select("id")
    .eq("contact_id", parsed.contactId)
    .eq("account_id", parsed.accountId);

  const leadIds = (leads ?? []).map((lead) => lead.id);

  if (leadIds.length > 0) {
    await supabase
      .from("lead_sequence_enrollments")
      .update({
        status: "cancelled",
        completed_at: now,
        next_step_due_at: null,
      })
      .eq("account_id", parsed.accountId)
      .eq("status", "active")
      .in("lead_id", leadIds);
  }

  return confirmationHtml(
    "You have been unsubscribed from marketing emails. You may still receive direct replies related to your inquiry.",
  );
}
