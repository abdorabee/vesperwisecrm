import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { requireAdminAccountId, requireUserId } from "@/lib/supabase/account";
import { exchangeGoogleCode, isGoogleConfigured } from "@/lib/google/client";

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  const settingsUrl = new URL("/settings/google", url.origin);

  if (oauthError) {
    settingsUrl.searchParams.set("error", oauthError);
    return NextResponse.redirect(settingsUrl);
  }

  if (!isGoogleConfigured() || !code || !state) {
    settingsUrl.searchParams.set("error", "invalid_request");
    return NextResponse.redirect(settingsUrl);
  }

  const accountId = await requireAdminAccountId();
  if (accountId !== state) {
    settingsUrl.searchParams.set("error", "account_mismatch");
    return NextResponse.redirect(settingsUrl);
  }

  const userId = await requireUserId();

  try {
    const tokens = await exchangeGoogleCode(code);

    const supabase = createServiceRoleClient();
    const { error } = await supabase.from("google_integrations").upsert(
      {
        account_id: accountId,
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        token_expires_at: tokens.expiresAt.toISOString(),
        connected_email: tokens.email,
        connected_by_user_id: userId,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "account_id" },
    );

    if (error) {
      throw new Error(error.message);
    }

    settingsUrl.searchParams.set("connected", "1");
  } catch (error) {
    settingsUrl.searchParams.set(
      "error",
      error instanceof Error ? error.message : "connection_failed",
    );
  }

  return NextResponse.redirect(settingsUrl);
}
