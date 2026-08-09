import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/lib/actions/auth";
import { getCurrentMembership, isAdminRole } from "@/lib/queries/members";
import { isPlatformAdminEmail } from "@/lib/supabase/platform-admin";
import { Button } from "@/components/ui/button";
import { DashboardSidebar } from "@/components/dashboard-nav";
import { OnboardingTourProvider } from "@/components/onboarding-tour-context";
import { OnboardingTour } from "./_components/onboarding-tour";
import { getDialerShellData } from "@/lib/queries/dialer";
import { getDialerCredentialStatus } from "@/lib/queries/dialer-credentials";
import { DialerSessionProvider, type ActiveDialerSession } from "@/components/dialer/dialer-session-provider";
import { ActiveCallPanel } from "@/components/dialer/active-call-panel";
import { isDialerEnabled } from "@/lib/dialer/config";

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
  const shouldAutoOpenTour =
    membership?.onboardingTourCompletedAt === null;
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
        <div className="flex min-h-screen">
        <DashboardSidebar
          isAdmin={isAdmin}
          isPlatformAdmin={isPlatformAdmin}
          footer={
            <div className="flex flex-col gap-2 px-1.5">
              <span className="truncate text-xs text-muted-foreground">
                {user.email}
              </span>
              <form action={signOutAction}>
                <Button
                  variant="ghost"
                  size="sm"
                  type="submit"
                  className="w-full justify-start px-1.5"
                >
                  Sign out
                </Button>
              </form>
            </div>
          }
          collapsedFooter={
            <form action={signOutAction} className="flex justify-center">
              <Button
                variant="ghost"
                size="icon-sm"
                type="submit"
                title="Sign out"
              >
                <LogOut className="size-4" />
              </Button>
            </form>
          }
        />
        <main className="min-w-0 flex-1 overflow-y-auto p-6">{children}</main>
          <OnboardingTour
            shouldAutoOpen={shouldAutoOpenTour}
            isAdmin={isAdmin}
          />
          <ActiveCallPanel dispositions={dialerShell.dispositions} />
        </div>
      </OnboardingTourProvider>
    </DialerSessionProvider>
  );
}
