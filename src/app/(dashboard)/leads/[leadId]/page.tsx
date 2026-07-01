import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  getLeadDetail,
  getLeadActivities,
  getRelatedLeads,
} from "@/lib/queries/leads";
import { getStages, getTags } from "@/lib/queries/pipeline";
import { getLeadEnrollments, getSequences } from "@/lib/queries/sequences";
import { getAccountMemberProfiles, getCurrentMembership, isAdminRole } from "@/lib/queries/members";
import { getLeadTasks } from "@/lib/queries/tasks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StageSelect } from "./_components/stage-select";
import { ActivityFeed } from "./_components/activity-feed";
import { TagEditor } from "./_components/tag-editor";
import { SendEmailDialog } from "./_components/send-email-dialog";
import { SequenceEnrollmentPanel } from "./_components/sequence-enrollment-panel";
import { RelatedLeadsPanel } from "./_components/related-leads-panel";
import { AddNoteForm } from "./_components/add-note-form";
import { TaskPanel } from "./_components/task-panel";
import { ContactEmailOptOutBadge } from "./_components/contact-email-opt-out-badge";
import { PropertyPanel } from "./_components/property-panel";

interface LeadDetailPageProps {
  params: Promise<{ leadId: string }>;
}

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const { leadId } = await params;
  const [
    lead,
    activities,
    relatedLeads,
    tasks,
    members,
    stages,
    allTags,
    enrollments,
    sequences,
  ] =
    await Promise.all([
      getLeadDetail(leadId),
      getLeadActivities(leadId),
      getRelatedLeads(leadId),
      getLeadTasks(leadId),
      getAccountMemberProfiles(),
      getStages(),
      getTags(),
      getLeadEnrollments(leadId),
      getSequences(),
    ]);

  const contactName = [lead.contact.first_name, lead.contact.last_name]
    .filter(Boolean)
    .join(" ");

  const membership = await getCurrentMembership();
  const isAdmin = membership ? isAdminRole(membership.role) : false;

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/pipeline"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
      >
        <ArrowLeft className="size-4" />
        Back to pipeline
      </Link>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">{lead.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <StageSelect
                  leadId={lead.id}
                  currentStageId={lead.pipeline_stage_id}
                  stages={stages}
                />
                {lead.value != null && (
                  <span className="text-sm text-muted-foreground tabular-nums">
                    ${Number(lead.value).toLocaleString()}
                  </span>
                )}
              </div>

              <TagEditor leadId={lead.id} leadTags={lead.tags} allTags={allTags} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Property & Contract</CardTitle>
            </CardHeader>
            <CardContent>
              <PropertyPanel leadId={lead.id} property={lead.property} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <TaskPanel leadId={lead.id} tasks={tasks} members={members} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sequences</CardTitle>
            </CardHeader>
            <CardContent>
              <SequenceEnrollmentPanel
                leadId={lead.id}
                enrollments={enrollments}
                availableSequences={sequences}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <AddNoteForm leadId={lead.id} />
              <ActivityFeed activities={activities} />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 text-sm">
              <p className="font-medium">{contactName || "—"}</p>
              {lead.contact.company && (
                <p className="text-muted-foreground">{lead.contact.company}</p>
              )}
              {lead.contact.email && <p>{lead.contact.email}</p>}
              <ContactEmailOptOutBadge
                contactId={lead.contact.id}
                emailOptedOutAt={lead.contact.email_opted_out_at}
                isAdmin={isAdmin}
              />
              {lead.contact.phone && <p>{lead.contact.phone}</p>}
              <div className="mt-2">
                <SendEmailDialog leadId={lead.id} contactEmail={lead.contact.email} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Related Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <RelatedLeadsPanel leads={relatedLeads} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
