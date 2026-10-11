import { Webhook } from "standardwebhooks";
import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";

export type PolarWebhookVerification =
  | { ok: true; event: unknown }
  | { ok: false; reason: "invalid_signature" };

export function webhookHeadersFromRequest(
  headers: Headers,
): Record<string, string> {
  return Object.fromEntries(headers.entries());
}

function schemaVerifiedPayload(error: unknown): unknown | null {
  if (!error || typeof error !== "object" || !("rawValue" in error)) {
    return null;
  }
  const rawValue = (error as { rawValue?: unknown }).rawValue;
  if (!rawValue || typeof rawValue !== "object") {
    return null;
  }
  return rawValue;
}

export function verifyPolarWebhookEvent(
  rawBody: string,
  headers: Record<string, string>,
  secret: string,
): PolarWebhookVerification {
  if (!secret.trim()) {
    return { ok: false, reason: "invalid_signature" };
  }

  try {
    const base64Secret = Buffer.from(secret, "utf-8").toString("base64");
    new Webhook(base64Secret).verify(rawBody, headers);
  } catch {
    return { ok: false, reason: "invalid_signature" };
  }

  try {
    return { ok: true, event: validateEvent(rawBody, headers, secret) };
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      return { ok: false, reason: "invalid_signature" };
    }
    const verified = schemaVerifiedPayload(error);
    if (verified) {
      return { ok: true, event: verified };
    }
    return { ok: false, reason: "invalid_signature" };
  }
}
