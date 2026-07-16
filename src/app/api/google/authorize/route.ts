import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireAdminAccountId } from "@/lib/supabase/account";
import { getGoogleAuthUrl, isGoogleConfigured } from "@/lib/google/client";
import { GOOGLE_OAUTH_STATE_COOKIE } from "@/lib/google/oauth-state";

export async function GET(): Promise<NextResponse> {
  if (!isGoogleConfigured()) {
    return NextResponse.json(
      { error: "Google integration isn't configured yet" },
      { status: 501 },
    );
  }

  await requireAdminAccountId();

  // Random per-flow nonce as the OAuth state, echoed back by Google and
  // matched against this cookie in the callback. The account comes from
  // the session there, so state carries no meaning beyond CSRF protection.
  const nonce = randomUUID();
  const cookieStore = await cookies();
  cookieStore.set(GOOGLE_OAUTH_STATE_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return NextResponse.redirect(getGoogleAuthUrl(nonce));
}
