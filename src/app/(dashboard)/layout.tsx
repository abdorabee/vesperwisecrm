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

  return (
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
      </div>
    </OnboardingTourProvider>
  );
}
