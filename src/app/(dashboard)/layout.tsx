import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/lib/actions/auth";
import { getCurrentMembership, isAdminRole } from "@/lib/queries/members";
import { isPlatformAdminEmail } from "@/lib/supabase/platform-admin";
import { Button } from "@/components/ui/button";
import { DashboardNav } from "@/components/dashboard-nav";

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
  const isAdmin = membership ? isAdminRole(membership.role) : false;
  const isPlatformAdmin = isPlatformAdminEmail(user.email);

  const links = [
    { href: "/pipeline", label: "Pipeline" },
    { href: "/sequences", label: "Sequences" },
    { href: "/workflows", label: "Workflows" },
    { href: "/scorecard", label: "My Scorecard" },
    { href: "/settings/profile", label: "Profile" },
    ...(isAdmin
      ? [
          { href: "/team", label: "Team", exact: true },
          { href: "/settings/email", label: "Email" },
          { href: "/team/groups", label: "Groups" },
          { href: "/team/scorecard", label: "Employee Scorecard" },
        ]
      : []),
    ...(isPlatformAdmin
      ? [{ href: "/platform/email", label: "Platform" }]
      : []),
  ];

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <header className="flex items-center justify-between gap-4 border-b px-6 py-3">
        <DashboardNav links={links} />
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {user.email}
          </span>
          <form action={signOutAction}>
            <Button variant="ghost" size="sm" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
