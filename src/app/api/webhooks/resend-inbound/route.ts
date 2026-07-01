import { NextResponse } from "next/server";
import { processInboundEmail } from "@/lib/email/process-inbound";
import { alertOnWebhookFailure, logEmailEvent } from "@/lib/email/logger";
import { getResendClient } from "@/lib/resend/client";

export async function POST(request: Request): Promise<NextResponse> {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 },
    );
  }

  const rawBody = await request.text();
  const resend = getResendClient();

  const webhookId =
    request.headers.get("svix-id") ??
    request.headers.get("webhook-id") ??
    "";
  const timestamp =
    request.headers.get("svix-timestamp") ??
    request.headers.get("webhook-timestamp") ??
    "";
  const signature =
    request.headers.get("svix-signature") ??
    request.headers.get("webhook-signature") ??
    "";

  let event;
  try {
    event = resend.webhooks.verify({
      payload: rawBody,
      headers: {
        id: webhookId,
        timestamp,
        signature,
      },
      webhookSecret,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (event.type !== "email.received") {
    return NextResponse.json({ ok: true });
  }

  try {
    await processInboundEmail(event.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logEmailEvent({
      event: "webhook_error",
      reason: message,
      webhook: "resend-inbound",
      resend_event_type: event.type,
    });
    await alertOnWebhookFailure({
      webhook: "resend-inbound",
      event_type: event.type,
      error: message,
    });
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
