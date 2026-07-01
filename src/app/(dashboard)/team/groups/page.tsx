import Link from "next/link";
import { requireAdminAccountId } from "@/lib/supabase/account";
import { getGroups } from "@/lib/queries/groups";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function GroupsPage() {
  await requireAdminAccountId();
  const groups = await getGroups();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Lead routing groups</h1>
        <Button render={<Link href="/team/groups/new" />} nativeButton={false}>
          New group
        </Button>
      </div>

      {groups.length === 0 ? (
        <p className="text-muted-foreground">
          No groups yet. Create one to route new leads to a weighted round
          robin of team members.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Link key={group.id} href={`/team/groups/${group.id}`}>
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-base">{group.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-1">
                  {group.members.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No members</p>
                  ) : (
                    group.members.map((member) => (
                      <Badge
                        key={member.userId}
                        variant={member.weight > 0 ? "secondary" : "outline"}
                        className="text-[10px]"
                      >
                        {member.email} · {member.weight}★
                      </Badge>
                    ))
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
