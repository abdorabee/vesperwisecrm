import { NextResponse } from "next/server";
import { processDeliveryEvent } from "@/lib/email/process-delivery";
import { alertOnWebhookFailure, logEmailEvent } from "@/lib/email/logger";
import { getResendClient } from "@/lib/resend/client";

const DELIVERY_EVENTS = new Set([
  "email.bounced",
  "email.complained",
  "email.failed",
]);

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

  if (!DELIVERY_EVENTS.has(event.type)) {
    return NextResponse.json({ ok: true });
  }

  const eventType =
    event.type === "email.bounced"
      ? "bounced"
      : event.type === "email.complained"
        ? "complained"
        : "failed";

  try {
    await processDeliveryEvent({
      eventType,
      data: event.data as { email_id: string; to?: string[]; tags?: Record<string, string> },
      rawPayload: event,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logEmailEvent({
      event: "webhook_error",
      reason: message,
      webhook: "resend-events",
      resend_event_type: event.type,
    });
    await alertOnWebhookFailure({
      webhook: "resend-events",
      event_type: event.type,
      error: message,
    });
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
