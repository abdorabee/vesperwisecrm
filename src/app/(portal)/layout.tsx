import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/queries/members";
import { signOutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { PortalSidebar } from "@/components/dashboard-nav";
import { getWorkspaceSettings } from "@/lib/queries/workspace-settings";
import { WorkspaceFormattingProvider } from "@/components/workspace-formatting-context";
import { AppearanceToggleButton } from "@/components/appearance-toggle";

export default async function PortalLayout({
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

  if (membership?.role !== "client") {
    redirect("/");
  }
  const workspace = await getWorkspaceSettings();

  return (
    <WorkspaceFormattingProvider settings={workspace}>
    <a href="#portal-main-content" className="sr-only z-[100] rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
    <div className="flex min-h-dvh flex-col md:flex-row">
      <PortalSidebar
        footer={
          <div className="flex flex-col gap-2 px-1.5">
            <span className="truncate text-xs text-muted-foreground">
              {user.email}
            </span>
            <AppearanceToggleButton showLabel className="w-full justify-start px-1.5" />
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
          <div className="flex flex-col items-center gap-1">
            <AppearanceToggleButton />
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
          </div>
        }
      />
      <main id="portal-main-content" tabIndex={-1} className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
    </div>
    </WorkspaceFormattingProvider>
  );
}
