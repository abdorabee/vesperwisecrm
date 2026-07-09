import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPortalLeads } from "@/lib/queries/portal";

function interestBadge(status: string | null) {
  if (status === "interested") {
    return <Badge className="bg-emerald-500/20 text-emerald-400">Interested</Badge>;
  }
  if (status === "declined") {
    return <Badge variant="secondary">Passed</Badge>;
  }
  return <Badge variant="outline">Needs review</Badge>;
}

export default async function PortalLeadsPage() {
  const leads = await getPortalLeads();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Your properties"
        description="Properties sourced for you. Review the details and let us know if you're interested."
      />

      {leads.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No properties have been sent your way yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {leads.map((lead) => (
            <Link key={lead.id} href={`/portal/leads/${lead.id}`}>
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardContent className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{lead.title}</p>
                    {interestBadge(lead.client_interest_status)}
                  </div>
                  {lead.property?.asking_price != null && (
                    <p className="text-lg font-semibold tabular-nums">
                      ${Number(lead.property.asking_price).toLocaleString()}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {lead.property?.condition
                      ? `Condition: ${lead.property.condition}`
                      : "Condition not yet noted"}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
