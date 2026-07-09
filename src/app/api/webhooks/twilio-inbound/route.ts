import { NextResponse } from "next/server";
import { alertOnWebhookFailure } from "@/lib/email/logger";
import { logSmsEvent } from "@/lib/sms/logger";
import { processInboundSms } from "@/lib/sms/process-inbound";
import { verifyTwilioSignature } from "@/lib/sms/verify-signature";

const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

function twimlResponse(): NextResponse {
  return new NextResponse(EMPTY_TWIML, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    return NextResponse.json(
      { error: "Twilio webhook not configured" },
      { status: 500 },
    );
  }

  const formData = await request.formData();
  const params: Record<string, string> = {};
  formData.forEach((value, key) => {
    if (typeof value === "string") {
      params[key] = value;
    }
  });

  // Twilio signs the exact public URL it POSTs to. Behind proxies that
  // rewrite the URL, set TWILIO_WEBHOOK_URL to the URL configured in Twilio.
  const webhookUrl = process.env.TWILIO_WEBHOOK_URL ?? request.url;
  const signature = request.headers.get("x-twilio-signature") ?? "";

  if (
    !signature ||
    !verifyTwilioSignature({ url: webhookUrl, params, signature, authToken })
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const from = params.From ?? "";
  const messageSid = params.MessageSid ?? "";
  if (!from || !messageSid) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    await processInboundSms({
      from,
      to: params.To ?? "",
      body: params.Body ?? "",
      messageSid,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logSmsEvent({
      event: "webhook_error",
      reason: message,
      webhook: "twilio-inbound",
      twilio_message_sid: messageSid,
    });
    await alertOnWebhookFailure({
      webhook: "twilio-inbound",
      error: message,
    });
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return twimlResponse();
}
