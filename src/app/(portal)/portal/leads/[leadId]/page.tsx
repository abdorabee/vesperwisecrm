import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPortalLeadDetail, getLeadClientComments } from "@/lib/queries/portal";
import { requireClientContext } from "@/lib/supabase/account";
import { createClient } from "@/lib/supabase/server";
import { ClientCommentThread } from "@/components/client-comment-thread";
import { InterestActions } from "./_components/interest-actions";

interface PortalLeadDetailPageProps {
  params: Promise<{ leadId: string }>;
}

const EMPTY = "—";

export default async function PortalLeadDetailPage({
  params,
}: PortalLeadDetailPageProps) {
  const { leadId } = await params;
  await requireClientContext();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [lead, comments] = await Promise.all([
    getPortalLeadDetail(leadId),
    getLeadClientComments(leadId),
  ]);

  const property = lead.property;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link
        href="/portal"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to properties
      </Link>

      <PageHeader
        title={lead.title}
        actions={<InterestActions leadId={lead.id} status={lead.client_interest_status} />}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Property details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Asking price</p>
            <p className="font-medium">
              {property?.asking_price != null
                ? `$${Number(property.asking_price).toLocaleString()}`
                : EMPTY}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Condition</p>
            <p className="font-medium">{property?.condition ?? EMPTY}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Beds / Baths / Sq ft</p>
            <p className="font-medium">
              {property?.bedrooms ?? EMPTY} / {property?.bathrooms ?? EMPTY} /{" "}
              {property?.square_feet ?? EMPTY}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Occupancy</p>
            <p className="font-medium">{property?.occupancy_status ?? EMPTY}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Updates done</p>
            <p className="font-medium">{property?.updates_done ?? EMPTY}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Updates needed</p>
            <p className="font-medium">{property?.updates_needed ?? EMPTY}</p>
          </div>
          {property?.notes && (
            <div className="sm:col-span-2">
              <p className="text-muted-foreground">Notes</p>
              <p className="font-medium whitespace-pre-wrap">{property.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comments</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientCommentThread
            leadId={lead.id}
            comments={comments}
            currentUserId={user?.id ?? ""}
            viewerLabel="You"
            otherLabel="Agency"
          />
        </CardContent>
      </Card>
    </div>
  );
}
