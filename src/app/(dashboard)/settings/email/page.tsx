import { requireAdminAccountId } from "@/lib/supabase/account";
import { getAccountEmailSettingsForAdmin } from "@/lib/queries/account-email";
import {
  getEmailSetupUiState,
  isAccountEmailReady,
} from "@/lib/email/account-settings";
import {
  getRecommendedDmarcRecord,
  getSendingDomain,
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
import { CaptureRepliesSettings } from "./_components/capture-replies-settings";
import { ReplyRoutingSettings } from "./_components/reply-routing-settings";
import { EmailHealthCard } from "./_components/email-health-card";
import { getInboundAddressPattern } from "@/lib/email/inbound-address";
import { getEmailHealthStats } from "@/lib/queries/email-health";

export default async function EmailSettingsPage() {
  await requireAdminAccountId();
  const settings = await getAccountEmailSettingsForAdmin();
  const uiState = getEmailSetupUiState(settings);
  const healthStats = await getEmailHealthStats();

  let dnsRecords: DnsRecordRow[] = [];
  if (settings?.resend_domain_id) {
    try {
      const domain = await getSendingDomain(settings.resend_domain_id);
      dnsRecords = [
        ...domain.records.filter(
          (record) => record.record === "SPF" || record.record === "DKIM",
        ),
        getRecommendedDmarcRecord(domain.name),
      ];
    } catch {
      dnsRecords = settings.sending_domain
        ? [getRecommendedDmarcRecord(settings.sending_domain)]
        : [];
    }
  }

  const emailReady = isAccountEmailReady(settings);
  const identityDisabled = uiState !== "verified";
  const inboundAddressPattern = getInboundAddressPattern();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Email</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure your sending domain and From address for outbound emails to
          leads.
        </p>
      </div>

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
              ? "This name and email appear on emails sent to leads."
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

      <Card>
        <CardHeader>
          <CardTitle>Reply routing</CardTitle>
          <CardDescription>
            Choose how lead replies are routed when your team sends email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReplyRoutingSettings
            replyRoutingMode={
              settings?.reply_routing_mode === "agent_direct"
                ? "agent_direct"
                : "shared_inbox"
            }
            defaultReplyToEmail={settings?.default_reply_to_email ?? null}
            disabled={!emailReady}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reply capture</CardTitle>
          <CardDescription>
            Route lead email replies back into the CRM activity feed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CaptureRepliesSettings
            enabled={settings?.capture_replies_enabled ?? true}
            inboundAddressPattern={inboundAddressPattern}
            disabled={!emailReady}
          />
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
