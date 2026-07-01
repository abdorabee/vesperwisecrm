import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { logEmailEvent } from "@/lib/email/logger";
import type { Json } from "@/lib/supabase/types";

type DeliveryEventType = "bounced" | "complained" | "failed";

function toLogEvent(
  eventType: DeliveryEventType,
): "bounce" | "complaint" | "failed" {
  if (eventType === "bounced") return "bounce";
  if (eventType === "complained") return "complaint";
  return "failed";
}

interface ResendDeliveryEventData {
  email_id: string;
  to?: string[];
  tags?: Record<string, string> | { name: string; value: string }[];
}

function parseTags(
  tags: ResendDeliveryEventData["tags"],
): { accountId: string | null; leadId: string | null } {
  if (!tags) {
    return { accountId: null, leadId: null };
  }

  if (Array.isArray(tags)) {
    const accountTag = tags.find((tag) => tag.name === "account_id");
    const leadTag = tags.find((tag) => tag.name === "lead_id");
    return {
      accountId: accountTag?.value ?? null,
      leadId: leadTag?.value ?? null,
    };
  }

  return {
    accountId: tags.account_id ?? null,
    leadId: tags.lead_id ?? null,
  };
}

export async function processDeliveryEvent(params: {
  eventType: DeliveryEventType;
  data: ResendDeliveryEventData;
  rawPayload: unknown;
}): Promise<void> {
  const { eventType, data, rawPayload } = params;
  const { accountId, leadId } = parseTags(data.tags);

  if (!accountId) {
    logEmailEvent({
      event: toLogEvent(eventType),
      resend_email_id: data.email_id,
      reason: "missing_account_id_tag",
      status: "skipped",
    });
    return;
  }

  const recipient = data.to?.[0] ?? null;
  const supabase = createServiceRoleClient();

  const { error } = await supabase.from("email_delivery_events").insert({
    account_id: accountId,
    lead_id: leadId,
    resend_email_id: data.email_id,
    event_type: eventType,
    recipient,
    payload: rawPayload as Json,
  });

  if (error) {
    throw new Error(error.message);
  }

  logEmailEvent({
    event: toLogEvent(eventType),
    account_id: accountId,
    lead_id: leadId,
    resend_email_id: data.email_id,
    recipient,
    status: "recorded",
  });
}
