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
}

function bucketKey(scope: string, identifier: string): string {
  // Hashed so raw IPs and bearer tokens never land in a queryable table.
  const digest = createHash("sha256").update(identifier).digest("hex");
  return `${scope}:${digest.slice(0, 32)}`;
}

/**
 * Returns true when the caller is within budget. Fails **open** on
 * infrastructure error: a database blip should degrade throughput protection,
 * not take signup and lead intake offline. Every caller still enforces its own
 * authentication, so an open failure never grants access.
 */
export async function consumeRateLimit({
  scope,
  identifier,
  limit,
  windowSeconds,
}: RateLimitRule): Promise<boolean> {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.rpc("consume_rate_limit", {
      p_bucket_key: bucketKey(scope, identifier),
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });

    if (error) {
      return true;
    }
    return data !== false;
  } catch {
    return true;
  }
}

// Best-effort client address from proxy headers. Vercel sets x-forwarded-for;
// the leftmost entry is the client, the rest are proxies.
export function clientAddress(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}
