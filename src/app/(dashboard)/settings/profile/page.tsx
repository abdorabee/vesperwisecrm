import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership, getOwnSenderIdentity } from "@/lib/queries/members";
import { PermissionState, SettingsPageHeader, SettingsSection } from "@/components/settings/settings-primitives";
import { SenderIdentityForm } from "./_components/sender-identity-form";
import { ReplayTourButton } from "./_components/replay-tour-button";

export default async function ProfileSettingsPage({ searchParams }: { searchParams: Promise<{ permission?: string }> }) {
  const supabase = await createClient();
  const [{ data: { user } }, identity, membership, params] = await Promise.all([
    supabase.auth.getUser(),
    getOwnSenderIdentity(),
    getCurrentMembership(),
    searchParams,
  ]);

  return (
    <div>
      <SettingsPageHeader eyebrow="Personal" title="Profile" description="Review your account details and control the sender identity used when you contact leads." />
      {params.permission === "admin" && <div className="pt-6"><PermissionState>You need owner or admin access to open that settings section.</PermissionState></div>}
      <SettingsSection title="Account" description="Authentication details come from your signed-in account and cannot be edited here.">
        <dl className="divide-y divide-border rounded-lg border border-border">
          <div className="grid gap-1 px-4 py-3 sm:grid-cols-[8rem_1fr]"><dt className="text-sm text-muted-foreground">Email</dt><dd className="text-sm font-medium">{user?.email ?? "—"}</dd></div>
          <div className="grid gap-1 px-4 py-3 sm:grid-cols-[8rem_1fr]"><dt className="text-sm text-muted-foreground">Role</dt><dd className="text-sm font-medium capitalize">{membership?.role ?? "—"}</dd></div>
        </dl>
      </SettingsSection>
      <SettingsSection title="Email sender identity" description="Leads see this display name and personal sender address on the workspace's verified domain.">
          <SenderIdentityForm
            fromDisplayName={identity.fromDisplayName}
            fromEmailLocalPart={identity.fromEmailLocalPart}
            sendingDomain={identity.sendingDomain}
          />
      </SettingsSection>
      <SettingsSection title="Product tour" description="Replay the product walkthrough whenever you want a refresher."><ReplayTourButton /></SettingsSection>
    </div>
  );
}
