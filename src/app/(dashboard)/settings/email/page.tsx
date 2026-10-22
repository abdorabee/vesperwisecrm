import { SettingsPageHeader } from "@/components/settings/settings-primitives";
import { requireSettingsAdmin } from "@/lib/settings-access";
import { getAccountEmailSettingsWithDomainForAdmin } from "@/lib/queries/account-email";
import {
  getEmailSetupUiState,
  isAccountEmailReady,
} from "@/lib/email/account-settings";
import {
  getRecommendedDmarcRecord,
  type DnsRecordRow,
} from "@/lib/email/resend-domains";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DomainOnboarding } from "./_components/domain-onboarding";
import { DomainStatusCard } from "./_components/domain-status-card";
import { DnsRecordsTable } from "./_components/dns-records-table";
import { EmailSettingsForm } from "./_components/email-settings-form";
import { SendTestEmailButton } from "./_components/send-test-email-button";
import { EmailHealthCard } from "./_components/email-health-card";
import { getEmailHealthStats } from "@/lib/queries/email-health";

export default async function EmailSettingsPage() {
  await requireSettingsAdmin();
  const { settings, domain } = await getAccountEmailSettingsWithDomainForAdmin();
  const uiState = getEmailSetupUiState(settings);
  const healthStats = await getEmailHealthStats();

  let dnsRecords: DnsRecordRow[] = [];
  if (domain) {
    dnsRecords = [
      ...domain.records.filter(
        (record) => record.record === "SPF" || record.record === "DKIM",
      ),
      getRecommendedDmarcRecord(domain.name),
    ];
  } else if (settings?.sending_domain) {
    dnsRecords = [getRecommendedDmarcRecord(settings.sending_domain)];
  }

  const emailReady = isAccountEmailReady(settings);
  const identityDisabled = uiState !== "verified";

  return (
    <div className="flex flex-col gap-6">
      <SettingsPageHeader eyebrow="Communication" title="Email" description="Configure the sending domain used for the client digest and new-lead notices. The product does not send bulk, cold, or automated email." />

      <Card id="domain-verification">
        <CardHeader>
          <CardTitle>Domain verification</CardTitle>
          <CardDescription>
            Add DNS records at your domain provider, then refresh to verify.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <DomainStatusCard
            uiState={uiState}
            sendingDomain={settings?.sending_domain ?? null}
          />
          <DomainOnboarding currentDomain={settings?.sending_domain ?? null} />
          {uiState !== "not_started" && <DnsRecordsTable records={dnsRecords} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>From address</CardTitle>
          <CardDescription>
            {uiState === "verified"
              ? "This name and email are the From address on workspace notices."
              : "Available after your domain is verified."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <EmailSettingsForm
            fromName={settings?.from_name ?? null}
            fromEmail={settings?.from_email ?? null}
            sendingDomain={settings?.sending_domain ?? null}
            disabled={identityDisabled}
          />
          <SendTestEmailButton disabled={!emailReady} />
        </CardContent>
      </Card>

      <EmailHealthCard
        uiState={uiState}
        lastTestSentAt={settings?.last_test_sent_at ?? null}
        outboundSuspended={settings?.outbound_suspended ?? false}
        stats={healthStats}
      />
    </div>
  );
}
