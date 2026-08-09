import "server-only";

import { redirect } from "next/navigation";
import { getCurrentMembership, isAdminRole } from "@/lib/queries/members";

export async function requireSettingsAdmin(): Promise<void> {
  const membership = await getCurrentMembership();
  if (!membership || !isAdminRole(membership.role)) {
    redirect("/settings/profile?permission=admin");
  }
}
