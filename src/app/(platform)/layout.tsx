import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdminEmail } from "@/lib/supabase/platform-admin";
import { signOutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { PlatformNav } from "@/components/dashboard-nav";

export default async function PlatformLayout({
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

  if (!isPlatformAdminEmail(user.email)) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <header className="flex items-center justify-between gap-4 border-b px-6 py-3">
        <PlatformNav links={[{ href: "/platform/email", label: "Email" }]} />
        <form action={signOutAction}>
          <Button variant="ghost" size="sm" type="submit">
            Sign out
          </Button>
        </form>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
