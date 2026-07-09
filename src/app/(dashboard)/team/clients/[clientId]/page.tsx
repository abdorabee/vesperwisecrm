import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminAccountId } from "@/lib/supabase/account";
import {
  getClientDetail,
  getClientLeads,
  getClientPortalMembers,
} from "@/lib/queries/clients";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClientForm } from "./_components/client-form";
import { InviteClientDialog } from "./_components/invite-client-dialog";

interface ClientDetailPageProps {
  params: Promise<{ clientId: string }>;
}

export default async function ClientDetailPage({
  params,
}: ClientDetailPageProps) {
  const { clientId } = await params;
  await requireAdminAccountId();

  const [client, leads, portalMembers] = await Promise.all([
    getClientDetail(clientId),
    getClientLeads(clientId),
    getClientPortalMembers(),
  ]);

  if (!client) {
    notFound();
  }

  const members = portalMembers[clientId] ?? [];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader title={client.name} description="Client details and portal access" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientForm client={client} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            Portal access
            <InviteClientDialog clientId={clientId} />
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No portal login yet. Invite a contact to give them access.
            </p>
          ) : (
            members.map((member) => (
              <Badge key={member.userId} variant="secondary">
                {member.email}
              </Badge>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assigned leads</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col divide-y divide-border">
          {leads.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No leads assigned to this client yet. Assign one from a lead's
              detail page.
            </p>
          ) : (
            leads.map((lead) => (
              <Link
                key={lead.id}
                href={`/leads/${lead.id}`}
                className="flex items-center justify-between gap-3 py-2 text-sm hover:underline"
              >
                <span>{lead.title}</span>
                <Badge variant="outline" className="text-[10px]">
                  {lead.client_interest_status ?? "pending"}
                </Badge>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
