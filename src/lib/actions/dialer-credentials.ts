"use server";

import { revalidatePath } from "next/cache";
import twilio from "twilio";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { requireAdminAccountId, requireUserId } from "@/lib/supabase/account";
import { encryptDialerSecret, decryptDialerSecret } from "@/lib/dialer/credentials-crypto";
import { dialerCredentialsSchema } from "@/lib/validations/dialer";

async function verifyTwilioCredentials(accountSid: string, authToken: string): Promise<void> {
  try {
    await twilio(accountSid, authToken).api.accounts(accountSid).fetch();
  } catch {
    throw new Error("Could not verify these credentials with Twilio. Double-check the Account SID and Auth Token.");
  }
}

export async function saveDialerCredentials(input: unknown): Promise<void> {
  const data = dialerCredentialsSchema.parse(input);
  const accountId = await requireAdminAccountId();
  const userId = await requireUserId();

  await verifyTwilioCredentials(data.accountSid, data.authToken);

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("dialer_provider_credentials").upsert({
    account_id: accountId,
    provider: "twilio",
    account_sid: data.accountSid,
    auth_token_ciphertext: encryptDialerSecret(data.authToken),
    api_key_sid: data.apiKeySid,
    api_key_secret_ciphertext: encryptDialerSecret(data.apiKeySecret),
    twiml_app_sid: data.twimlAppSid,
    from_number: data.fromNumber,
    status: "active",
    last_verified_at: new Date().toISOString(),
    connected_by_user_id: userId,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);

  revalidatePath("/dialer");
}

export async function disconnectDialerCredentials(): Promise<void> {
  const accountId = await requireAdminAccountId();
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("dialer_provider_credentials")
    .delete()
    .eq("account_id", accountId);
  if (error) throw new Error(error.message);

  revalidatePath("/dialer");
}

export async function testDialerCredentials(): Promise<{ ok: boolean; message: string }> {
  const accountId = await requireAdminAccountId();
  const supabase = createServiceRoleClient();
  const { data: row, error } = await supabase
    .from("dialer_provider_credentials")
    .select("account_sid, auth_token_ciphertext")
    .eq("account_id", accountId)
    .maybeSingle();
  if (error || !row) throw new Error("No Twilio account is connected");

  try {
    await verifyTwilioCredentials(row.account_sid, decryptDialerSecret(row.auth_token_ciphertext));
    await supabase
      .from("dialer_provider_credentials")
      .update({ status: "active", last_verified_at: new Date().toISOString() })
      .eq("account_id", accountId);
    revalidatePath("/dialer");
    return { ok: true, message: "Connection verified" };
  } catch (verifyError) {
    await supabase
      .from("dialer_provider_credentials")
      .update({ status: "invalid" })
      .eq("account_id", accountId);
    revalidatePath("/dialer");
    return {
      ok: false,
      message: verifyError instanceof Error ? verifyError.message : "Could not verify credentials",
    };
  }
}
