import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SIDEBAR_COLLAPSED_COOKIE } from "@/lib/sidebar";
import { getCurrentMembership, isAdminRole } from "@/lib/queries/members";
import { isPlatformAdminEmail } from "@/lib/supabase/platform-admin";
import { DashboardSidebar, MobileNavigation } from "@/components/dashboard-nav";
import { OnboardingTourProvider } from "@/components/onboarding-tour-context";
import { OnboardingTour } from "./_components/onboarding-tour";
import { getDialerShellData } from "@/lib/queries/dialer";
import { getDialerCredentialStatus } from "@/lib/queries/dialer-credentials";
import { DialerSessionProvider, type ActiveDialerSession } from "@/components/dialer/dialer-session-provider";
import { ActiveCallPanel } from "@/components/dialer/active-call-panel";
import { isDialerEnabled } from "@/lib/dialer/config";
import { getWorkspaceSettings } from "@/lib/queries/workspace-settings";
import { WorkspaceFormattingProvider } from "@/components/workspace-formatting-context";
import { getBillingSummary } from "@/lib/billing/access";
import { getBillingPlanCapabilities } from "@/lib/billing/entitlements";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const membership = await getCurrentMembership();

  if (membership?.role === "client") {
    redirect("/portal");
  }

  const isAdmin = membership ? isAdminRole(membership.role) : false;
  const isPlatformAdmin = isPlatformAdminEmail(user.email);
  const billingSummary = membership
    ? await getBillingSummary(membership.accountId)
    : null;
  const billingCapabilities = billingSummary?.plan
    ? getBillingPlanCapabilities(billingSummary.plan)
    : [];
  const workspace = await getWorkspaceSettings();
  // Read here so the rail renders at its final width on the server; reading it
  // on the client instead is what made a collapsed sidebar flash open on load.
  const sidebarCollapsed =
    (await cookies()).get(SIDEBAR_COLLAPSED_COOKIE)?.value === "1";
  const dialerShell = isDialerEnabled()
    ? await getDialerShellData()
    : { active: null, dispositions: [] };
  const twilioCredentialStatus = isDialerEnabled()
    ? await getDialerCredentialStatus()
    : { connected: false, accountSid: null, fromNumber: null, status: null, lastVerifiedAt: null };
  const twilioConnected = twilioCredentialStatus.connected && twilioCredentialStatus.status === "active";
  const activeAttempt = dialerShell.active?.attempts.find((attempt) =>
    ["queued", "initiating", "ringing", "answered"].includes(attempt.status),
  );
  const initialSession: ActiveDialerSession | null = dialerShell.active && activeAttempt
    ? {
        callId: dialerShell.active.id,
        attemptId: activeAttempt.id,
        contactId: dialerShell.active.contact.id,
        contactName: [dialerShell.active.contact.first_name, dialerShell.active.contact.last_name].filter(Boolean).join(" "),
        leadId: dialerShell.active.lead?.id ?? null,
        leadTitle: dialerShell.active.lead?.title ?? null,
        status: dialerShell.active.status as ActiveDialerSession["status"],
        startedAt: dialerShell.active.started_at ?? dialerShell.active.created_at,
        error: dialerShell.active.failure_reason,
        recoverable: false,
      }
    : null;

  return (
    <DialerSessionProvider initialSession={initialSession} enabled={isDialerEnabled()} twilioConnected={twilioConnected}>
      <OnboardingTourProvider>
        <WorkspaceFormattingProvider settings={workspace}>
        <a href="#main-content" className="sr-only z-[100] rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
          Skip to content
        </a>
        <div className="flex min-h-dvh">
          <DashboardSidebar
            workspaceName={workspace.name}
            email={user.email ?? "Signed-in member"}
            role={membership?.role ?? "member"}
            isAdmin={isAdmin}
            isPlatformAdmin={isPlatformAdmin}
            billingCapabilities={billingCapabilities}
            defaultCollapsed={sidebarCollapsed}
          />
          <div className="min-w-0 flex-1">
            <MobileNavigation
              workspaceName={workspace.name}
              email={user.email ?? "Signed-in member"}
              role={membership?.role ?? "member"}
              isAdmin={isAdmin}
              isPlatformAdmin={isPlatformAdmin}
              billingCapabilities={billingCapabilities}
            />
            <main id="main-content" tabIndex={-1} className="min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
          </div>
          <OnboardingTour isAdmin={isAdmin} />
          <ActiveCallPanel dispositions={dialerShell.dispositions} />
        </div>
        </WorkspaceFormattingProvider>
      </OnboardingTourProvider>
    </DialerSessionProvider>
  );
}
