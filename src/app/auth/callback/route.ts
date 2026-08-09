import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveSafeRedirect } from "@/lib/auth/safe-redirect";

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Never concatenate `next` onto origin -- see resolveSafeRedirect.
  const next = resolveSafeRedirect(searchParams.get("next"), origin);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  return NextResponse.redirect(
    new URL(
      `/login?error=${encodeURIComponent("Could not authenticate")}`,
      origin,
    ),
  );
}
