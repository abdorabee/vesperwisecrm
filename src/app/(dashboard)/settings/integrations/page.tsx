import Link from "next/link";
import { requireSettingsAdmin } from "@/lib/settings-access";
import { getAccountEmailSettingsForAdmin } from "@/lib/queries/account-email";
import { getGoogleIntegration } from "@/lib/queries/google";
import { getDialerCredentialStatus } from "@/lib/queries/dialer-credentials";
import { isAccountEmailReady } from "@/lib/email/account-settings";
import { isGoogleConfigured } from "@/lib/google/client";
import { SettingsPageHeader, SettingsSection, ConnectionStatus } from "@/components/settings/settings-primitives";

export default async function IntegrationsSettingsPage() {
  await requireSettingsAdmin();
  const [email, google, twilio] = await Promise.all([
    getAccountEmailSettingsForAdmin(),
    getGoogleIntegration(),
    getDialerCredentialStatus(),
  ]);
  return (
    <div>
      <SettingsPageHeader eyebrow="Integrations" title="Overview" description="Review the external services that are actually connected to this workspace." />
      <SettingsSection title="Connected services" description="Only integrations supported by the current product appear here.">
        <div className="space-y-3">
          <Link href="/settings/email"><ConnectionStatus connected={isAccountEmailReady(email)} label="Resend email" detail={email?.sending_domain ?? "Set up a verified sending domain"} /></Link>
          <Link href="/settings/google"><ConnectionStatus connected={Boolean(google) && isGoogleConfigured()} label="Google Docs and Drive" detail={google?.connected_email ?? (isGoogleConfigured() ? "Ready to connect" : "OAuth environment variables are not configured")} /></Link>
          <Link href="/settings/calling"><ConnectionStatus connected={twilio.connected && twilio.status === "active"} label="Twilio calling" detail={twilio.fromNumber ?? "Connect your workspace-owned Twilio account"} /></Link>
          <Link href="/settings/data-migration" className="flex items-start justify-between gap-4 rounded-lg border border-border bg-muted/30 p-4">
            <div>
              <p className="text-sm font-medium">Migrate data</p>
              <p className="mt-1 text-xs text-muted-foreground">Import CSV exports from Carrot CRM, HubSpot, GoHighLevel, Pipedrive, or Follow Up Boss</p>
            </div>
          </Link>
        </div>
      </SettingsSection>
    </div>
  );
}
