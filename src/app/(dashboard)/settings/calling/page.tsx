import { requireSettingsAdmin } from "@/lib/settings-access";
import { getDialerPageData } from "@/lib/queries/dialer";
import { SettingsPageHeader } from "@/components/settings/settings-primitives";
import { DialerSettings } from "../../dialer/_components/dialer-workspace";

export default async function CallingSettingsPage() {
  await requireSettingsAdmin();
  const data = await getDialerPageData();
  return (
    <div>
      <SettingsPageHeader eyebrow="Communication" title="Calling" description="Connect the Twilio account your workspace owns, then configure concurrency, retries, and call outcomes." />
      <div className="pt-7"><DialerSettings data={data} /></div>
    </div>
  );
}
