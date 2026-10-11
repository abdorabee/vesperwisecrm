import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { requireAdminAccountId } from "@/lib/supabase/account";
import {
  encryptGoogleToken,
  isEncryptedGoogleToken,
} from "@/lib/google/token-crypto";
import type { GoogleConnectionSummary } from "@/lib/google/connection";

export type { GoogleConnectionSummary };

export async function getGoogleIntegration(): Promise<GoogleConnectionSummary | null> {
  const accountId = await requireAdminAccountId();
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("google_integrations")
    .select("connected_email, drive_folder_id, access_token, refresh_token")
    .eq("account_id", accountId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }

  if (
    !isEncryptedGoogleToken(data.access_token) ||
    !isEncryptedGoogleToken(data.refresh_token)
  ) {
    try {
      const { error: updateError } = await supabase
        .from("google_integrations")
        .update({
          access_token: isEncryptedGoogleToken(data.access_token)
            ? data.access_token
            : encryptGoogleToken(data.access_token),
          refresh_token: isEncryptedGoogleToken(data.refresh_token)
            ? data.refresh_token
            : encryptGoogleToken(data.refresh_token),
          updated_at: new Date().toISOString(),
        })
        .eq("account_id", accountId);
      if (updateError) {
        throw new Error(updateError.message);
      }
    } catch {
      // Settings can still show the connection when the server key is absent.
    }
  }

  return {
    connectedEmail: data.connected_email,
    driveFolderId: data.drive_folder_id,
  };
}
