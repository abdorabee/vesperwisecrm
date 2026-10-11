import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { resolveSafeRedirect } from "@/lib/auth/safe-redirect";
import { redeemAcceptedInvite } from "@/lib/auth/redeem-invite";
import {
  getSessionMembership,
  rememberActiveAccount,
} from "@/lib/supabase/account";

const ALLOWED_OTP_TYPES: readonly EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
];

// `EmailOtpType` includes a `(string & {})` widening member, so TypeScript
// won't reject an arbitrary query string here -- this allow-list is the real
// safety net before the value ever reaches verifyOtp.
function parseOtpType(value: string | null): EmailOtpType | null {
  return value && (ALLOWED_OTP_TYPES as readonly string[]).includes(value)
    ? (value as EmailOtpType)
    : null;
}

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const otpType = parseOtpType(searchParams.get("type"));
  // Never concatenate `next` onto origin -- see resolveSafeRedirect.
  const next = resolveSafeRedirect(searchParams.get("next"), origin);
  const supabase = await createClient();

  // A PKCE `code` is also how OAuth and other logins return. Only an invite
  // OTP (token hash + type=invite) is the person accepting that invite.
  const inviteAcceptance = !code && Boolean(tokenHash) && otpType === "invite";
  const established = code
    ? !(await supabase.auth.exchangeCodeForSession(code)).error
    : tokenHash && otpType
      ? !(
          await supabase.auth.verifyOtp({
            type: otpType,
            token_hash: tokenHash,
          })
        ).error
      : false;

  if (established) {
    const joinedAccountId = inviteAcceptance
      ? await redeemAcceptedInvite()
      : null;
    if (joinedAccountId) {
      await rememberActiveAccount(joinedAccountId);
    } else {
      const membership = await getSessionMembership();
      if (membership) {
        await rememberActiveAccount(membership.accountId);
      }
    }
    return NextResponse.redirect(new URL(next, origin));
  }

  return NextResponse.redirect(
    new URL(
      `/login?error=${encodeURIComponent("Could not authenticate")}`,
      origin,
    ),
  );
}
