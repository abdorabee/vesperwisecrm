import { randomUUID } from "crypto";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { Tables } from "@/lib/supabase/types";

export type ReplyTokenRow = Tables<"email_reply_tokens">;

export interface ResolvedReplyToken {
  accountId: string;
  leadId: string;
  outboundActivityId: string | null;
  threadId: string;
}

function getReplyTokenTtlDays(): number {
  const raw = process.env.REPLY_TOKEN_TTL_DAYS;
  if (!raw) {
    return 365;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 365;
}

export async function createReplyToken(
  accountId: string,
  leadId: string,
): Promise<{ token: string; threadId: string }> {
  const supabase = createServiceRoleClient();
  const token = randomUUID();
  const threadId = randomUUID();
  const ttlDays = getReplyTokenTtlDays();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + ttlDays);

  const { error } = await supabase.from("email_reply_tokens").insert({
    token,
    account_id: accountId,
    lead_id: leadId,
    thread_id: threadId,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    throw new Error(error.message);
  }

  return { token, threadId };
}

export async function linkReplyTokenToActivity(
  token: string,
  outboundActivityId: string,
): Promise<void> {
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from("email_reply_tokens")
    .update({
      outbound_activity_id: outboundActivityId,
      thread_id: outboundActivityId,
    })
    .eq("token", token);

  if (error) {
    throw new Error(error.message);
  }
}

export async function resolveReplyToken(
  token: string,
): Promise<ResolvedReplyToken | null> {
  const supabase = createServiceRoleClient();

  const { data: row, error } = await supabase
    .from("email_reply_tokens")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (error || !row) {
    return null;
  }

  if (new Date(row.expires_at) <= new Date()) {
    return null;
  }

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id, account_id")
    .eq("id", row.lead_id)
    .eq("account_id", row.account_id)
    .maybeSingle();

  if (leadError || !lead) {
    return null;
  }

  return {
    accountId: row.account_id,
    leadId: row.lead_id,
    outboundActivityId: row.outbound_activity_id,
    threadId: row.thread_id,
  };
}
