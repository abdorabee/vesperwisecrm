import { NextResponse } from "next/server";
import { getBillingConfig } from "@/lib/billing/config";
import { processPolarWebhook } from "@/lib/billing/polar-webhook";
import {
  verifyPolarWebhookEvent,
  webhookHeadersFromRequest,
} from "@/lib/billing/polar-webhook-parse";

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

  const verified = verifyPolarWebhookEvent(
    rawBody,
    webhookHeadersFromRequest(request.headers),
    config.webhookSecret,
  );
  if (!verified.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processPolarWebhook(verified.event, providerEventId);
    return NextResponse.json({ ok: true, ...result }, { status: 202 });
  } catch {
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
