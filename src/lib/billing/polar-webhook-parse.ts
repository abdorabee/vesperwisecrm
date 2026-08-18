import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";

export type PolarWebhookVerification =
  | { ok: true; event: unknown }
  | { ok: false; reason: "invalid_signature" };

export function webhookHeadersFromRequest(
  headers: Headers,
): Record<string, string> {
  return Object.fromEntries(headers.entries());
}

export function verifyPolarWebhookEvent(
  rawBody: string,
  headers: Record<string, string>,
  secret: string,
): PolarWebhookVerification {
  try {
    return { ok: true, event: validateEvent(rawBody, headers, secret) };
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      return { ok: false, reason: "invalid_signature" };
    }

    try {
      return { ok: true, event: JSON.parse(rawBody) as unknown };
    } catch {
      return { ok: true, event: { type: "unparseable" } };
    }
  }
}
