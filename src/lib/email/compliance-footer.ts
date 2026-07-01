import { createHmac, timingSafeEqual } from "crypto";

const TOKEN_TTL_MS = 365 * 24 * 60 * 60 * 1000;

function getUnsubscribeSecret(): string {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) {
    throw new Error("UNSUBSCRIBE_SECRET is not configured");
  }
  return secret;
}

function getAppUrl(): string {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    "http://localhost:3000";
  return siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`;
}

export function createUnsubscribeToken(
  contactId: string,
  accountId: string,
): string {
  const exp = Date.now() + TOKEN_TTL_MS;
  const payload = `${contactId}:${accountId}:${exp}`;
  const sig = createHmac("sha256", getUnsubscribeSecret())
    .update(payload)
    .digest("base64url");
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

export function verifyUnsubscribeToken(
  token: string,
): { contactId: string; accountId: string } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const lastColon = decoded.lastIndexOf(":");
    if (lastColon === -1) {
      return null;
    }

    const sig = decoded.slice(lastColon + 1);
    const payload = decoded.slice(0, lastColon);
    const expectedSig = createHmac("sha256", getUnsubscribeSecret())
      .update(payload)
      .digest("base64url");

    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expectedSig);
    if (
      sigBuf.length !== expectedBuf.length ||
      !timingSafeEqual(sigBuf, expectedBuf)
    ) {
      return null;
    }

    const [contactId, accountId, expStr] = payload.split(":");
    const exp = Number(expStr);
    if (!contactId || !accountId || !Number.isFinite(exp) || Date.now() > exp) {
      return null;
    }

    return { contactId, accountId };
  } catch {
    return null;
  }
}

export function buildComplianceFooter(params: {
  contactId: string;
  accountId: string;
}): string {
  const token = createUnsubscribeToken(params.contactId, params.accountId);
  const url = `${getAppUrl()}/api/unsubscribe?token=${encodeURIComponent(token)}`;

  return [
    "",
    "---",
    "You're receiving this because you were added as a contact.",
    `Unsubscribe: ${url}`,
  ].join("\n");
}
