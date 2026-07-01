import type { AccountEmailSettings } from "@/lib/email/account-settings";
import { buildReplyToAddress, getInboundEmailDomain } from "@/lib/email/inbound-address";
import { createReplyToken } from "@/lib/email/reply-tokens";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type ReplyRoutingMode = "shared_inbox" | "agent_direct";

export interface ResolvedReplyRouting {
  replyTo: string | undefined;
  replyToken: string | undefined;
  threadId: string | undefined;
  captureEnabled: boolean;
  mode: ReplyRoutingMode;
}

async function getLeadOwnerEmail(leadId: string): Promise<string | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc("get_lead_owner_email", {
    p_lead_id: leadId,
  });

  if (error) {
    return null;
  }

  return typeof data === "string" ? data : null;
}

export async function resolveReplyRouting(params: {
  settings: AccountEmailSettings;
  accountId: string;
  leadId: string;
}): Promise<ResolvedReplyRouting> {
  const { settings, accountId, leadId } = params;
  const mode: ReplyRoutingMode =
    settings.reply_routing_mode === "agent_direct"
      ? "agent_direct"
      : "shared_inbox";

  if (mode === "agent_direct") {
    const ownerEmail = await getLeadOwnerEmail(leadId);
    const fallback =
      settings.default_reply_to_email?.trim() ||
      settings.from_email?.trim() ||
      undefined;

    return {
      replyTo: ownerEmail ?? fallback,
      replyToken: undefined,
      threadId: undefined,
      captureEnabled: false,
      mode,
    };
  }

  const captureEnabled =
    settings.capture_replies_enabled && Boolean(getInboundEmailDomain());

  if (!captureEnabled) {
    return {
      replyTo: undefined,
      replyToken: undefined,
      threadId: undefined,
      captureEnabled: false,
      mode,
    };
  }

  const created = await createReplyToken(accountId, leadId);

  return {
    replyTo: buildReplyToAddress(created.token),
    replyToken: created.token,
    threadId: created.threadId,
    captureEnabled: true,
    mode,
  };
}
