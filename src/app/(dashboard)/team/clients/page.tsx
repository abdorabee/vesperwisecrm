import Link from "next/link";
import { requireAdminAccountId } from "@/lib/supabase/account";
import { getClients, getClientPortalMembers } from "@/lib/queries/clients";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { NewClientDialog } from "./_components/new-client-dialog";

export default async function ClientsPage() {
  await requireAdminAccountId();
  const [clients, portalMembers] = await Promise.all([
    getClients(),
    getClientPortalMembers(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Clients"
        description="External investor clients you source properties for. Invite them to a portal where they can review deals and mark interest."
        actions={<NewClientDialog />}
      />

      {clients.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No clients yet. Add one to start assigning leads and inviting a
          portal login.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => {
            const members = portalMembers[client.id] ?? [];
            return (
              <Link key={client.id} href={`/team/clients/${client.id}`}>
                <Card className="h-full transition-colors hover:bg-muted/50">
                  <CardHeader>
                    <CardTitle className="text-base">{client.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    {client.contact_email && (
                      <p className="text-sm text-muted-foreground">
                        {client.contact_email}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {members.length === 0 ? (
                        <Badge variant="outline" className="text-[10px]">
                          No portal login yet
                        </Badge>
                      ) : (
                        members.map((member) => (
                          <Badge
                            key={member.userId}
                            variant="secondary"
                            className="text-[10px]"
                          >
                            {member.email}
                          </Badge>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
