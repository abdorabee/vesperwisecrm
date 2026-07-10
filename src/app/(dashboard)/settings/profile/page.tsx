import { PageHeader } from "@/components/page-header";
import { getOwnSenderIdentity } from "@/lib/queries/members";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SenderIdentityForm } from "./_components/sender-identity-form";
import { ReplayTourButton } from "./_components/replay-tour-button";

export default async function ProfileSettingsPage() {
  const identity = await getOwnSenderIdentity();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader
        title="Profile"
        description="Customize how your name appears on emails sent to leads."
      />

      <Card>
        <CardHeader>
          <CardTitle>Email sender identity</CardTitle>
          <CardDescription>
            When you send emails, leads see your display name on the account&apos;s
            verified domain.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SenderIdentityForm
            fromDisplayName={identity.fromDisplayName}
            fromEmailLocalPart={identity.fromEmailLocalPart}
            sendingDomain={identity.sendingDomain}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Product tour</CardTitle>
          <CardDescription>
            Revisit the dashboard walkthrough whenever you want a quick reset.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReplayTourButton />
        </CardContent>
      </Card>
    </div>
  );
}
