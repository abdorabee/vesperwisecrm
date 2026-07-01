export type EmailLogEvent =
  | "send"
  | "inbound"
  | "bounce"
  | "complaint"
  | "failed"
  | "webhook_error";

export interface EmailLogPayload {
  event: EmailLogEvent;
  account_id?: string;
  lead_id?: string | null;
  resend_message_id?: string | null;
  resend_email_id?: string | null;
  recipient?: string | null;
  reason?: string;
  [key: string]: unknown;
}

export function logEmailEvent(payload: EmailLogPayload): void {
  console.log(
    JSON.stringify({
      scope: "email",
      ts: new Date().toISOString(),
      ...payload,
    }),
  );
}

let lastAlertAt = 0;
const ALERT_COOLDOWN_MS = 60_000;

export async function alertOnWebhookFailure(
  context: Record<string, unknown>,
): Promise<void> {
  const url = process.env.ALERT_WEBHOOK_URL;
  if (!url) {
    return;
  }

  const now = Date.now();
  if (now - lastAlertAt < ALERT_COOLDOWN_MS) {
    return;
  }
  lastAlertAt = now;

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "VesperwiseCRM email webhook processing failed",
        context,
      }),
    });
  } catch {
    // Best-effort alerting
  }
}
