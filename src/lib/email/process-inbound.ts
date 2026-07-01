import { parseTokenFromAddresses } from "@/lib/email/inbound-address";
import { resolveReplyToken } from "@/lib/email/reply-tokens";
import { sanitizeHtml, stripHtmlTags } from "@/lib/email/sanitize-html";
import { getAccountEmailSettings } from "@/lib/email/account-settings";
import { logEmailEvent } from "@/lib/email/logger";
import { getResendClient } from "@/lib/resend/client";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type InboundProcessResult =
  | { status: "processed"; activityId: string }
  | { status: "quarantined"; reason: string };

interface InboundEmailEventData {
  email_id: string;
  from: string;
  to: string[];
  received_for: string[];
  subject: string;
  message_id: string;
}

function quarantine(
  reason: string,
  context: Record<string, unknown>,
): InboundProcessResult {
  logEmailEvent({
    event: "inbound",
    reason,
    status: "quarantined",
    ...context,
  });
  return { status: "quarantined", reason };
}

function buildSnippet(text: string | null, html: string | null): string {
  const source = text?.trim() || stripHtmlTags(html);
  return source.slice(0, 280);
}

export async function processInboundEmail(
  event: InboundEmailEventData,
): Promise<InboundProcessResult> {
  const addresses = [...event.to, ...event.received_for];
  const token = parseTokenFromAddresses(addresses);

  if (!token) {
    return quarantine("unknown_token", {
      to: event.to,
      received_for: event.received_for,
      from: event.from,
      email_id: event.email_id,
    });
  }

  const resolved = await resolveReplyToken(token);
  if (!resolved) {
    return quarantine("invalid_or_expired_token", {
      token,
      from: event.from,
      email_id: event.email_id,
    });
  }

  const settings = await getAccountEmailSettings(resolved.accountId);
  if (!settings?.capture_replies_enabled) {
    return quarantine("capture_disabled", {
      account_id: resolved.accountId,
      from: event.from,
      email_id: event.email_id,
    });
  }

  const resend = getResendClient();
  const { data: fullEmail, error: fetchError } =
    await resend.emails.receiving.get(event.email_id);

  if (fetchError || !fullEmail) {
    return quarantine("fetch_failed", {
      email_id: event.email_id,
      error: fetchError?.message,
    });
  }

  const headers = fullEmail.headers ?? {};
  const inReplyTo =
    headers["In-Reply-To"] ?? headers["in-reply-to"] ?? null;
  const references =
    headers["References"] ?? headers["references"] ?? null;
  const bodyText = fullEmail.text ?? null;
  const bodyHtmlSanitized = sanitizeHtml(fullEmail.html);

  const supabase = createServiceRoleClient();
  const { data: activity, error: insertError } = await supabase
    .from("activities")
    .insert({
      account_id: resolved.accountId,
      lead_id: resolved.leadId,
      type: "email_received",
      actor_user_id: null,
      payload: {
        from: fullEmail.from,
        subject: fullEmail.subject,
        snippet: buildSnippet(bodyText, fullEmail.html),
        body_text: bodyText,
        body_html_sanitized: bodyHtmlSanitized,
        resend_email_id: event.email_id,
        message_id: fullEmail.message_id,
        in_reply_to: inReplyTo,
        references,
        thread_id: resolved.threadId,
        in_reply_to_activity_id: resolved.outboundActivityId,
      },
    })
    .select("id")
    .single();

  if (insertError || !activity) {
    return quarantine("insert_failed", {
      email_id: event.email_id,
      error: insertError?.message,
    });
  }

  logEmailEvent({
    event: "inbound",
    account_id: resolved.accountId,
    lead_id: resolved.leadId,
    resend_email_id: event.email_id,
    status: "processed",
    activity_id: activity.id,
  });

  return { status: "processed", activityId: activity.id };
}
