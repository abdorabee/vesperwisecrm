import { NextResponse } from "next/server";
import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";
import { getBillingConfig } from "@/lib/billing/config";
import { processPolarWebhook } from "@/lib/billing/polar-webhook";

export async function POST(request: Request): Promise<NextResponse> {
  let config;
  try {
    config = getBillingConfig();
  } catch {
    return NextResponse.json({ error: "Webhook is not configured" }, { status: 500 });
  }

  if (!config.enabled || !config.webhookSecret) {
    return NextResponse.json({ error: "Webhook is not configured" }, { status: 500 });
  }

  const rawBody = await request.text();
  const providerEventId = request.headers.get("webhook-id");
  if (!providerEventId) {
    return NextResponse.json({ error: "Missing webhook ID" }, { status: 400 });
  }

  let event: unknown;
  try {
    event = validateEvent(
      rawBody,
      Object.fromEntries(request.headers.entries()),
      config.webhookSecret,
    );
  } catch (error) {
    if (error instanceof WebhookVerificationError || error instanceof Error) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processPolarWebhook(event, providerEventId);
    return NextResponse.json({ ok: true, ...result });
  } catch {
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
