import { logSmsEvent } from "@/lib/sms/logger";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type InboundSmsResult =
  | { status: "processed"; activityId: string }
  | { status: "quarantined"; reason: string };

export interface InboundSmsEventData {
  from: string;
  to: string;
  body: string;
  messageSid: string;
}

const SNIPPET_LENGTH = 280;
const CONTACT_CANDIDATE_LIMIT = 100;
const LEAD_CANDIDATE_LIMIT = 20;

// Compare phone numbers on their last 10 digits so "+15551234567",
// "5551234567", and "(555) 123-4567" all resolve to the same contact.
export function normalizePhoneDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export function buildSmsThreadKey(phone: string): string | null {
  const digits = normalizePhoneDigits(phone);
  return digits ? `sms:${digits}` : null;
}

function quarantine(
  reason: string,
  context: Record<string, unknown>,
): InboundSmsResult {
  logSmsEvent({
    event: "inbound",
    reason,
    status: "quarantined",
    ...context,
  });
  return { status: "quarantined", reason };
}

export async function processInboundSms(
  event: InboundSmsEventData,
): Promise<InboundSmsResult> {
  const fromDigits = normalizePhoneDigits(event.from);
  if (!fromDigits) {
    return quarantine("missing_from_number", {
      twilio_message_sid: event.messageSid,
    });
  }

  const supabase = createServiceRoleClient();

  // Loose suffix prefilter in SQL, then exact digit-normalized match in JS,
  // because stored phones may carry formatting characters.
  const lastFourDigits = fromDigits.slice(-4);
  const { data: candidates, error: contactError } = await supabase
    .from("contacts")
    .select("id, account_id, phone")
    .is("deleted_at", null)
    .not("phone", "is", null)
    .ilike("phone", `%${lastFourDigits}%`)
    .limit(CONTACT_CANDIDATE_LIMIT);

  if (contactError) {
    return quarantine("contact_lookup_failed", {
      from: event.from,
      twilio_message_sid: event.messageSid,
      error: contactError.message,
    });
  }

  const matchedContacts = (candidates ?? []).filter(
    (contact) =>
      contact.phone && normalizePhoneDigits(contact.phone) === fromDigits,
  );

  if (matchedContacts.length === 0) {
    return quarantine("unknown_sender", {
      from: event.from,
      twilio_message_sid: event.messageSid,
    });
  }

  const { data: leads, error: leadError } = await supabase
    .from("leads")
    .select("id, account_id, contact_id, status, created_at")
    .in(
      "contact_id",
      matchedContacts.map((contact) => contact.id),
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(LEAD_CANDIDATE_LIMIT);

  if (leadError) {
    return quarantine("lead_lookup_failed", {
      from: event.from,
      twilio_message_sid: event.messageSid,
      error: leadError.message,
    });
  }

  if (!leads || leads.length === 0) {
    return quarantine("no_lead_for_contact", {
      from: event.from,
      twilio_message_sid: event.messageSid,
    });
  }

  // Thread onto the most recent open lead; fall back to the most recent lead.
  const lead = leads.find((row) => row.status === "open") ?? leads[0];

  const body = event.body.trim();
  const { data: activity, error: insertError } = await supabase
    .from("activities")
    .insert({
      account_id: lead.account_id,
      lead_id: lead.id,
      type: "sms_received",
      actor_user_id: null,
      payload: {
        from: event.from,
        to: event.to,
        snippet: body.slice(0, SNIPPET_LENGTH),
        body_text: body,
        twilio_message_sid: event.messageSid,
        thread_key: buildSmsThreadKey(event.from),
      },
    })
    .select("id")
    .single();

  if (insertError || !activity) {
    return quarantine("insert_failed", {
      from: event.from,
      twilio_message_sid: event.messageSid,
      error: insertError?.message,
    });
  }

  logSmsEvent({
    event: "inbound",
    account_id: lead.account_id,
    lead_id: lead.id,
    twilio_message_sid: event.messageSid,
    status: "processed",
    activity_id: activity.id,
  });

  return { status: "processed", activityId: activity.id };
}
