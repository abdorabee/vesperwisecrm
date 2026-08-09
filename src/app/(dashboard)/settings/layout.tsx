import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getCurrentMembership, isAdminRole } from "@/lib/queries/members";
import { SettingsNavigation } from "@/components/settings/settings-navigation";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const membership = await getCurrentMembership();
  const isAdmin = membership ? isAdminRole(membership.role) : false;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-5 flex items-center gap-1.5 text-xs text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <ChevronRight className="size-3" aria-hidden="true" />
        <span aria-current="page">Settings</span>
      </div>
      <div className="grid gap-7 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12">
        <SettingsNavigation isAdmin={isAdmin} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
