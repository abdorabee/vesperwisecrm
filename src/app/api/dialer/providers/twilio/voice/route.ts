import { NextResponse } from "next/server";
import { z } from "zod";
import { getDialerProvider } from "@/lib/dialer/providers/registry";
import { twilioIdentityFor } from "@/lib/dialer/providers/twilio/server";
import { canonicalDialerWebhookUrl, readFormParams } from "@/lib/dialer/webhook";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { logDialerEvent } from "@/lib/dialer/logger";

export const runtime = "nodejs";

const inputSchema = z.object({
  attemptId: z.string().uuid(),
  CallSid: z.string().min(8).max(64),
  From: z.string().min(1).max(160),
});

function xml(body: string, status = 200): NextResponse {
  return new NextResponse(body, {
    status,
    headers: { "Content-Type": "text/xml; charset=utf-8", "Cache-Control": "no-store" },
  });
}

const REJECT_TWIML =
  '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Unable to place this call.</Say><Hangup/></Response>';

export async function POST(request: Request): Promise<NextResponse> {
  const provider = getDialerProvider();
  const params = await readFormParams(request);

  const parsed = inputSchema.safeParse(params);
  if (!parsed.success) return xml(REJECT_TWIML, 400);

  const supabase = createServiceRoleClient();
  const { data: attempt, error } = await supabase
    .from("call_attempts")
    .select("id, account_id, user_id, status, call:calls(to_phone_e164)")
    .eq("id", parsed.data.attemptId)
    .eq("provider", "twilio")
    .maybeSingle();
  const call = Array.isArray(attempt?.call) ? attempt.call[0] : attempt?.call;

  if (error || !attempt) {
    logDialerEvent("warn", "voice_request_rejected", {
      attemptId: parsed.data.attemptId,
      code: "attempt_invalid",
    });
    return xml(REJECT_TWIML, 409);
  }

  const signature = request.headers.get("x-twilio-signature") ?? "";
  if (!signature || !(await provider.validateWebhook({
    url: canonicalDialerWebhookUrl(request),
    signature,
    params,
  }, attempt.account_id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const expectedFrom = `client:${twilioIdentityFor(attempt.account_id, attempt.user_id)}`;
  if (!call || parsed.data.From !== expectedFrom ||
      !["initiating", "ringing"].includes(attempt.status)) {
    logDialerEvent("warn", "voice_request_rejected", {
      attemptId: parsed.data.attemptId,
      code: "attempt_invalid",
    });
    return xml(REJECT_TWIML, 409);
  }

  const { data: attached, error: attachError } = await supabase.rpc(
    "attach_dialer_provider_call",
    {
      p_attempt_id: attempt.id,
      p_provider_parent_call_id: parsed.data.CallSid,
      p_provider_event_key: `${parsed.data.CallSid}:voice-request`,
      p_payload: { call_sid: parsed.data.CallSid, direction: "outbound-client" },
    },
  );
  if (attachError || !attached) {
    logDialerEvent("error", "voice_request_attach_failed", {
      accountId: attempt.account_id,
      attemptId: attempt.id,
      code: attachError?.code ?? "not_attached",
    });
    return xml(REJECT_TWIML, 409);
  }

  return xml(await provider.createOutboundInstructions({
    attemptId: attempt.id,
    toPhoneE164: call.to_phone_e164,
    accountId: attempt.account_id,
  }));
}
