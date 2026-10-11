import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

function escapeIlike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

// Grants membership for a pending invite. Call this only after an explicit
// invite OTP is verified. Creating the auth user, or any other login, is
// not acceptance.
export async function redeemAcceptedInvite(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email?.trim();
  if (!user || !email) {
    return null;
  }

  const service = createServiceRoleClient();
  const { data: invites, error } = await service
    .from("invites")
    .select("id, account_id, role, client_id, email")
    .is("redeemed_at", null)
    .gt("expires_at", new Date().toISOString())
    .ilike("email", escapeIlike(email))
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  const invite = invites?.[0];
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
