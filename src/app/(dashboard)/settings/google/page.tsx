import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminAccountId } from "@/lib/supabase/account";
import { getGoogleIntegration } from "@/lib/queries/google";
import { isGoogleConfigured } from "@/lib/google/client";
import { GoogleConnectionCard } from "./_components/google-connection-card";

interface GoogleSettingsPageProps {
  searchParams: Promise<{ connected?: string; error?: string }>;
}

export default async function GoogleSettingsPage({
  searchParams,
}: GoogleSettingsPageProps) {
  await requireAdminAccountId();
  const [integration, params] = await Promise.all([
    getGoogleIntegration(),
    searchParams,
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader
        title="Google"
        description="Connect Google Docs and Drive to generate one-click property reports from a lead's intake details."
      />

      {!isGoogleConfigured() && (
        <Card className="border-amber-500/30">
          <CardHeader>
            <CardTitle className="text-base">Not configured yet</CardTitle>
            <CardDescription>
              An admin needs to set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
              (a Google Cloud OAuth client with Docs and Drive scopes) before
              this can be connected.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Connection</CardTitle>
          <CardDescription>
            Reports are created under the connected Google account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GoogleConnectionCard
            integration={integration}
            configured={isGoogleConfigured()}
            connected={params.connected === "1"}
            error={params.error ?? null}
          />
        </CardContent>
      </Card>
    </div>
  );
}
