import { google } from "googleapis";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { Tables } from "@/lib/supabase/types";

const SCOPES = [
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/userinfo.email",
];

export type GoogleIntegration = Tables<"google_integrations">;

export function isGoogleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function getRedirectUri(): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const base = siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`;
  return `${base}/api/google/callback`;
}

function createOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Google integration isn't configured yet. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
    );
  }

  return new google.auth.OAuth2(clientId, clientSecret, getRedirectUri());
}

export function getGoogleAuthUrl(state: string): string {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state,
  });
}

export interface ExchangedGoogleTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  email: string | null;
}

export async function exchangeGoogleCode(
  code: string,
): Promise<ExchangedGoogleTokens> {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);

  if (!tokens.access_token || !tokens.refresh_token || !tokens.expiry_date) {
    throw new Error(
      "Google didn't return offline access. Reconnect and approve access when prompted.",
    );
  }

  client.setCredentials(tokens);

  let email: string | null = null;
  try {
    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const { data } = await oauth2.userinfo.get();
    email = data.email ?? null;
  } catch {
    email = null;
  }

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: new Date(tokens.expiry_date),
    email,
  };
}

export interface AuthorizedGoogleClient {
  client: InstanceType<typeof google.auth.OAuth2>;
  integration: GoogleIntegration;
}

export async function getAuthorizedGoogleClient(
  accountId: string,
): Promise<AuthorizedGoogleClient> {
  const supabase = createServiceRoleClient();
  const { data: integration, error } = await supabase
    .from("google_integrations")
    .select("*")
    .eq("account_id", accountId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!integration) {
    throw new Error(
      "Google Docs isn't connected yet. An admin needs to connect it in Settings → Google.",
    );
  }

  const client = createOAuthClient();
  client.setCredentials({
    access_token: integration.access_token,
    refresh_token: integration.refresh_token,
    expiry_date: new Date(integration.token_expires_at).getTime(),
  });

  client.on("tokens", (tokens) => {
    if (!tokens.access_token) {
      return;
    }

    void supabase
      .from("google_integrations")
      .update({
        access_token: tokens.access_token,
        token_expires_at: tokens.expiry_date
          ? new Date(tokens.expiry_date).toISOString()
          : integration.token_expires_at,
        updated_at: new Date().toISOString(),
      })
      .eq("account_id", accountId);
  });

  return { client, integration };
}
