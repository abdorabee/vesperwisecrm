import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assertAccountEmailReady,
  getAccountEmailSettings,
} from "@/lib/email/account-settings";
import { buildComplianceFooter } from "@/lib/email/compliance-footer";
import { logEmailEvent } from "@/lib/email/logger";
import { resolveReplyRouting } from "@/lib/email/reply-routing";
import {
  formatFromAddress,
  getMemberSenderIdentity,
} from "@/lib/email/sender-identity";
import { linkReplyTokenToActivity } from "@/lib/email/reply-tokens";
import { getResendClient } from "@/lib/resend/client";
import type { Database } from "@/lib/supabase/types";

export interface SendLeadEmailResult {
  activityId: string;
  resendMessageId: string | null;
}

export async function sendLeadFacingEmail(params: {
  supabase: SupabaseClient<Database>;
  accountId: string;
  leadId: string;
  to: string;
  subject: string;
  body: string;
  actorUserId: string | null;
  contactId?: string;
  isMarketing?: boolean;
}): Promise<SendLeadEmailResult> {
  const {
    supabase,
    accountId,
    leadId,
    to,
    subject,
    body: rawBody,
    actorUserId,
    contactId,
    isMarketing,
  } = params;

  const settings = await getAccountEmailSettings(accountId);
  assertAccountEmailReady(settings);

  const memberIdentity = actorUserId
    ? await getMemberSenderIdentity(accountId, actorUserId)
    : null;
  const fromAddress = formatFromAddress(settings, memberIdentity);

  const body =
    isMarketing && contactId
      ? rawBody + buildComplianceFooter({ contactId, accountId })
      : rawBody;

  const routing = await resolveReplyRouting({
    settings,
    accountId,
    leadId,
  });

  const resend = getResendClient();
  const { data: sendResult, error: sendError } = await resend.emails.send({
    from: fromAddress,
    to,
    subject,
    text: body,
    ...(routing.replyTo ? { replyTo: routing.replyTo } : {}),
    tags: [
      { name: "account_id", value: accountId },
      { name: "lead_id", value: leadId },
    ],
  });

  if (sendError) {
    logEmailEvent({
      event: "send",
      account_id: accountId,
      lead_id: leadId,
      error: sendError.message,
      status: "failed",
    });
    throw new Error(sendError.message);
  }

  const activityPayload = {
    subject,
    to,
    from: fromAddress,
    resend_message_id: sendResult?.id ?? null,
    reply_routing_mode: routing.mode,
    ...(memberIdentity?.fromDisplayName
      ? { sender_display: memberIdentity.fromDisplayName }
      : {}),
    ...(routing.replyTo ? { reply_to: routing.replyTo } : {}),
    ...(routing.threadId ? { thread_id: routing.threadId } : {}),
    ...(routing.replyToken ? { outbound_token: routing.replyToken } : {}),
    ...(isMarketing ? { is_marketing: true } : {}),
  };

  const { data: activity, error: activityError } = await supabase
    .from("activities")
    .insert({
      account_id: accountId,
      lead_id: leadId,
      type: "email_sent",
      actor_user_id: actorUserId,
      payload: activityPayload,
    })
    .select("id")
    .single();

  if (activityError || !activity) {
    throw new Error(activityError?.message ?? "Failed to log email activity");
  }

  if (routing.replyToken) {
    await linkReplyTokenToActivity(routing.replyToken, activity.id);
    await supabase
      .from("activities")
      .update({
        payload: {
          ...activityPayload,
          thread_id: activity.id,
        },
      })
      .eq("id", activity.id);
  }

  logEmailEvent({
    event: "send",
    account_id: accountId,
    lead_id: leadId,
    resend_message_id: sendResult?.id ?? null,
    reply_routing_mode: routing.mode,
    status: "sent",
  });

  return {
    activityId: activity.id,
    resendMessageId: sendResult?.id ?? null,
  };
}
