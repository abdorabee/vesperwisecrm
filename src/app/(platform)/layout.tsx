import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdminEmail } from "@/lib/supabase/platform-admin";
import { signOutAction } from "@/lib/actions/auth";

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
      <header className="flex items-center justify-between border-b px-6 py-3">
        <nav className="flex items-center gap-4 text-sm font-medium">
          <span className="font-semibold">VesperwiseCRM Platform</span>
          <Link
            href="/platform/email"
            className="text-muted-foreground hover:text-foreground"
          >
            Email
          </Link>
        </nav>
        <form action={signOutAction}>
          <button type="submit" className="text-sm text-muted-foreground">
            Sign out
          </button>
        </form>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
