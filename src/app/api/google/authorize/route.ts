import { NextResponse } from "next/server";
import { requireAdminAccountId } from "@/lib/supabase/account";
import { getGoogleAuthUrl, isGoogleConfigured } from "@/lib/google/client";

export async function GET(): Promise<NextResponse> {
  if (!isGoogleConfigured()) {
    return NextResponse.json(
      { error: "Google integration isn't configured yet" },
      { status: 501 },
    );
  }

  const accountId = await requireAdminAccountId();
  const url = getGoogleAuthUrl(accountId);

  return NextResponse.redirect(url);
}
