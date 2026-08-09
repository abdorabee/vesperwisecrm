import { timingSafeEqual } from "crypto";

// Shared bearer check for the scheduled routes. Fails closed when CRON_SECRET
// is unset, and compares in constant time to match the discipline already used
// in verify-signature.ts and compliance-footer.ts.
export function isAuthorizedCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }

  const provided = request.headers.get("authorization");
  if (!provided) {
    return false;
  }

  const expectedBuffer = Buffer.from(`Bearer ${secret}`, "utf8");
  const providedBuffer = Buffer.from(provided, "utf8");

  return (
    expectedBuffer.length === providedBuffer.length &&
    timingSafeEqual(expectedBuffer, providedBuffer)
  );
}
