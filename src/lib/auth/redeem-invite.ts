import "server-only";

import { hashInviteAuthToken } from "@/lib/auth/invite-token";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

// Grants membership for the invite bound to this verified OTP. Call this
// only after an explicit invite OTP is verified. A newer invite for the
// same email is a different token and must not be redeemed here.
export async function redeemAcceptedInvite(
  tokenHash: string,
): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email?.trim();
  if (!user || !email || !tokenHash) {
    return null;
  }

  const service = createServiceRoleClient();
  const { data: invite, error } = await service
    .from("invites")
    .select("id, account_id, role, client_id, email")
    .eq("auth_token_hash", hashInviteAuthToken(tokenHash))
    .is("redeemed_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!invite || invite.email.toLowerCase() !== email.toLowerCase()) {
    return null;
  }

  const { error: memberError } = await service.from("account_members").insert({
    account_id: invite.account_id,
    user_id: user.id,
    role: invite.role,
    client_id: invite.role === "client" ? invite.client_id : null,
  });

  if (memberError && memberError.code !== "23505") {
    throw new Error(memberError.message);
  }

  const { error: redeemError } = await service
    .from("invites")
    .update({ redeemed_at: new Date().toISOString() })
    .eq("id", invite.id)
    .is("redeemed_at", null);

  if (redeemError) {
    throw new Error(redeemError.message);
  }

  return invite.account_id;
}
