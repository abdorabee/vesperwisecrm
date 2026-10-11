import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createHash } from "crypto";

// Postgres-backed fixed windows. Chosen over Redis because the stack has no
// cache tier and this must work on Vercel Hobby; the cost is one round-trip per
// guarded call, which is acceptable on the endpoints below.

export interface RateLimitRule {
  /** Namespace, e.g. "signup" or "intake". */
  scope: string;
  /** Caller identity: IP, token hash, account id. Hashed before storage. */
  identifier: string;
  limit: number;
  windowSeconds: number;
  /** Signup, marketing mail, and intake deny the request when the limiter errors. */
  failClosed?: boolean;
}

function bucketKey(scope: string, identifier: string): string {
  // Hashed so raw IPs and bearer tokens never land in a queryable table.
  const digest = createHash("sha256").update(identifier).digest("hex");
  return `${scope}:${digest.slice(0, 32)}`;
}

/**
 * Returns true when the caller is within budget. Paths that send mail or
 * accept a public write pass `failClosed` so a limiter error denies the call.
 * Other callers still fail open: a database blip should not take AI offline.
 */
export async function consumeRateLimit({
  scope,
  identifier,
  limit,
  windowSeconds,
  failClosed = false,
}: RateLimitRule): Promise<boolean> {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.rpc("consume_rate_limit", {
      p_bucket_key: bucketKey(scope, identifier),
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });

    if (error) {
      return !failClosed;
    }
    return data !== false;
  } catch {
    return !failClosed;
  }
}

// Platform-asserted client IP. `x-vercel-forwarded-for` is set by the edge
// and is not the caller-supplied `x-forwarded-for` list. `x-real-ip` is the
// fallback when that header is absent (local and non-Vercel proxies).
export function platformClientIp(headers: Headers): string {
  const vercel = headers.get("x-vercel-forwarded-for");
  if (vercel) {
    const first = vercel.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

export function clientAddress(request: Request): string {
  return platformClientIp(request.headers);
}
