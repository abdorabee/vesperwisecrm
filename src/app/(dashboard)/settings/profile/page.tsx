import { getOwnSenderIdentity } from "@/lib/queries/members";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SenderIdentityForm } from "./_components/sender-identity-form";

export default async function ProfileSettingsPage() {
  const identity = await getOwnSenderIdentity();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Customize how your name appears on emails sent to leads.
        </p>
      </div>

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
    </div>
  );
}
