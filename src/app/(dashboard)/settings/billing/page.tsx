import { requireSettingsAdmin } from "@/lib/settings-access";
import { requireAdminAccountId } from "@/lib/supabase/account";
import { getBillingSummary } from "@/lib/billing/access";
import { SettingsPageHeader } from "@/components/settings/settings-primitives";
import { BillingControls } from "./_components/billing-controls";

export default async function BillingSettingsPage() {
  await requireSettingsAdmin();
  const accountId = await requireAdminAccountId();
  const summary = await getBillingSummary(accountId);

  return (
    <div>
      <SettingsPageHeader
        eyebrow="Workspace"
        title="Billing"
        description="Manage the Polar subscription, paid seats, renewal state, and the capabilities available to this workspace."
      />
      <BillingControls summary={summary} />
    </div>
  );
}
