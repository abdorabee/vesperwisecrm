import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/lib/actions/auth";
import { getCurrentMembership, isAdminRole } from "@/lib/queries/members";
import { Button } from "@/components/ui/button";

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

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <nav className="flex items-center gap-4 text-sm font-medium">
          <Link href="/" className="font-semibold">
            VesperwiseCRM
          </Link>
          <Link href="/pipeline" className="text-muted-foreground hover:text-foreground">
            Pipeline
          </Link>
          <Link href="/sequences" className="text-muted-foreground hover:text-foreground">
            Sequences
          </Link>
          <Link href="/workflows" className="text-muted-foreground hover:text-foreground">
            Workflows
          </Link>
          <Link href="/scorecard" className="text-muted-foreground hover:text-foreground">
            My Scorecard
          </Link>
          {isAdmin && (
            <>
              <Link href="/team" className="text-muted-foreground hover:text-foreground">
                Team
              </Link>
              <Link
                href="/team/groups"
                className="text-muted-foreground hover:text-foreground"
              >
                Groups
              </Link>
              <Link
                href="/team/scorecard"
                className="text-muted-foreground hover:text-foreground"
              >
                Employee Scorecard
              </Link>
            </>
          )}
        </nav>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{user.email}</span>
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
