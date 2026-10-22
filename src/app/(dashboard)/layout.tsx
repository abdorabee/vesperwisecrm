import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SIDEBAR_COLLAPSED_COOKIE } from "@/lib/sidebar";
import { getCurrentMembership, isAdminRole } from "@/lib/queries/members";
import { isPlatformAdminEmail } from "@/lib/supabase/platform-admin";
import { DashboardSidebar, MobileNavigation } from "@/components/dashboard-nav";
import { OnboardingTourProvider } from "@/components/onboarding-tour-context";
import { OnboardingTour } from "./_components/onboarding-tour";
import { getWorkspaceSettings } from "@/lib/queries/workspace-settings";
import { WorkspaceFormattingProvider } from "@/components/workspace-formatting-context";
import { getBillingSummary } from "@/lib/billing/access";
import { getBillableNavCapabilities } from "@/lib/billing/entitlements";
import { isOutreachUiEnabled } from "@/lib/features/outreach-ui";

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
  const billingCapabilities = getBillableNavCapabilities(
    billingSummary?.plan ?? null,
    billingSummary?.accessMode ?? "billing_required",
  );
  const outreachUiEnabled = isOutreachUiEnabled();
  const workspace = await getWorkspaceSettings();
  // Read here so the rail renders at its final width on the server; reading it
  // on the client instead is what made a collapsed sidebar flash open on load.
  const sidebarCollapsed =
    (await cookies()).get(SIDEBAR_COLLAPSED_COOKIE)?.value === "1";

  return (
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
            outreachUiEnabled={outreachUiEnabled}
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
              outreachUiEnabled={outreachUiEnabled}
            />
            <main id="main-content" tabIndex={-1} className="min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
          </div>
          <OnboardingTour
            isAdmin={isAdmin}
            includeWorkflows={billingCapabilities.includes("workflows")}
            includeOutreach={outreachUiEnabled}
          />
        </div>
        </WorkspaceFormattingProvider>
      </OnboardingTourProvider>
  );
}
