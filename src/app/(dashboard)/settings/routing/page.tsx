import Link from "next/link";
import { requireSettingsAdmin } from "@/lib/settings-access";
import { getGroups } from "@/lib/queries/groups";
import { SettingsPageHeader, SettingsSection } from "@/components/settings/settings-primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function RoutingSettingsPage() {
  await requireSettingsAdmin();
  const groups = await getGroups();
  return (
    <div>
      <SettingsPageHeader eyebrow="Workspace" title="Lead routing" description="Distribute new leads with weighted routing groups while preserving individual assignment controls." />
      <SettingsSection title="Routing groups" description="Weights control proportional distribution. A weight of zero temporarily pauses assignment to that member.">
        <div className="space-y-4">
          <Button render={<Link href="/settings/routing/new" />} nativeButton={false}>New routing group</Button>
          {groups.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <p className="font-medium">No routing groups yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Create a group to distribute incoming leads across selected teammates.</p>
            </div>
          ) : (
            <div className="divide-y divide-border rounded-lg border border-border">
              {groups.map((group) => (
                <Link key={group.id} href={`/settings/routing/${group.id}`} className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-muted/50">
                  <div><p className="text-sm font-medium">{group.name}</p><p className="mt-1 text-xs text-muted-foreground">{group.members.length} member{group.members.length === 1 ? "" : "s"}</p></div>
                  <div className="flex flex-wrap justify-end gap-1">{group.members.slice(0, 3).map((member) => <Badge key={member.userId} variant="secondary">{member.email} · {member.weight}</Badge>)}</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </SettingsSection>
    </div>
  );
}
