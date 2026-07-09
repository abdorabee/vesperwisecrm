import { createHmac, timingSafeEqual } from "crypto";

interface VerifyTwilioSignatureInput {
  url: string;
  params: Record<string, string>;
  signature: string;
  authToken: string;
}

// Twilio signs webhooks with HMAC-SHA1 over the full request URL followed by
// every POST param's key+value concatenated in alphabetical key order.
// https://www.twilio.com/docs/usage/security#validating-requests
export function verifyTwilioSignature({
  url,
  params,
  signature,
  authToken,
}: VerifyTwilioSignatureInput): boolean {
  const sortedKeys = Object.keys(params).sort();
  const signedPayload = sortedKeys.reduce(
    (data, key) => data + key + params[key],
    url,
  );

  const expected = createHmac("sha1", authToken)
    .update(signedPayload, "utf8")
    .digest();
  const provided = Buffer.from(signature, "base64");

  return (
    expected.length === provided.length && timingSafeEqual(expected, provided)
  );
}
