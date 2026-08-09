import { NextResponse } from "next/server";
import { z } from "zod";
import { getDialerProvider } from "@/lib/dialer/providers/registry";
import { canonicalDialerWebhookUrl, readFormParams } from "@/lib/dialer/webhook";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { logDialerEvent } from "@/lib/dialer/logger";

export const runtime = "nodejs";

const querySchema = z.object({ attemptId: z.string().uuid() });

export async function POST(request: Request): Promise<NextResponse> {
  const provider = getDialerProvider();
  const params = await readFormParams(request);

  const query = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!query.success) {
    return NextResponse.json({ error: "Invalid callback target" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data: attempt, error: attemptError } = await supabase
    .from("call_attempts")
    .select("account_id")
    .eq("id", query.data.attemptId)
    .eq("provider", "twilio")
    .maybeSingle();
  if (attemptError || !attempt) {
    return NextResponse.json({ error: "Invalid callback target" }, { status: 400 });
  }

  const signature = request.headers.get("x-twilio-signature") ?? "";
  if (!signature || !(await provider.validateWebhook({
    url: canonicalDialerWebhookUrl(request),
    signature,
    params,
  }, attempt.account_id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const event = provider.normalizeWebhookEvent(params);
  if (!event.providerCallId || event.providerSequence < 0) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { data: result, error } = await supabase.rpc("process_dialer_provider_event", {
    p_attempt_id: query.data.attemptId,
    p_provider_call_id: event.providerCallId,
    p_provider_event_key: event.providerEventKey,
    p_provider_sequence: event.providerSequence,
    p_event_type: event.eventType,
    p_status: event.status,
    p_failure_code: event.failureCode,
    p_failure_reason: event.failureReason,
    p_payload: event.safePayload,
    p_occurred_at: event.occurredAt,
  });
  if (error) {
    logDialerEvent("error", "status_callback_failed", {
      attemptId: query.data.attemptId,
      providerEventKey: event.providerEventKey,
      code: error.code,
    });
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  logDialerEvent("info", "status_callback_processed", {
    attemptId: query.data.attemptId,
    providerEventKey: event.providerEventKey,
    status: event.status,
    result,
  });
  return NextResponse.json({ ok: true, result });
}
