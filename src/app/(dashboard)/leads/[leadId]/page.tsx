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
import { getClientsForAssignment } from "@/lib/queries/clients";
import { getLeadClientComments } from "@/lib/queries/portal";
import { requireUserId } from "@/lib/supabase/account";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StageSelect } from "./_components/stage-select";
import { AiScorePanel } from "./_components/ai-score-panel";
import { ActivityFeed } from "./_components/activity-feed";
import { TagEditor } from "./_components/tag-editor";
import { SendEmailDialog } from "./_components/send-email-dialog";
import { SequenceEnrollmentPanel } from "./_components/sequence-enrollment-panel";
import { RelatedLeadsPanel } from "./_components/related-leads-panel";
import { AddNoteForm } from "./_components/add-note-form";
import { TaskPanel } from "./_components/task-panel";
import { ContactEmailOptOutBadge } from "./_components/contact-email-opt-out-badge";
import { PropertyPanel } from "./_components/property-panel";
import { GenerateReportButton } from "./_components/generate-report-button";
import { ClientAssignmentPanel } from "./_components/client-assignment-panel";
import { ClientCommentThread } from "@/components/client-comment-thread";
import { ClickToCallButton } from "@/components/dialer/click-to-call-button";
import { getLeadCallHistory } from "@/lib/queries/dialer";
import { Badge } from "@/components/ui/badge";
import { ContactDoNotCallControl } from "@/components/dialer/contact-do-not-call-control";
import { isDialerEnabled } from "@/lib/dialer/config";
import { getWorkspaceSettings } from "@/lib/queries/workspace-settings";
import { formatWorkspaceCurrency, formatWorkspaceDateTime } from "@/lib/workspace-settings";

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
    clients,
    currentUserId,
    callHistory,
    workspace,
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
      getClientsForAssignment(),
      requireUserId(),
      isDialerEnabled() ? getLeadCallHistory(leadId) : Promise.resolve([]),
      getWorkspaceSettings(),
    ]);

  const clientComments = lead.client_id
    ? await getLeadClientComments(leadId)
    : [];

  const contactName = [lead.contact.first_name, lead.contact.last_name]
    .filter(Boolean)
    .join(" ");

  const membership = await getCurrentMembership();
  const isAdmin = membership ? isAdminRole(membership.role) : false;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/pipeline"
        className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
      >
        <ArrowLeft className="size-4 shrink-0" />
        Back to pipeline
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-8 lg:col-span-2">
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
                    {formatWorkspaceCurrency(Number(lead.value), workspace)}
                  </span>
                )}
              </div>

              <TagEditor leadId={lead.id} leadTags={lead.tags} allTags={allTags} />

              <AiScorePanel
                leadId={lead.id}
                score={lead.ai_score}
                factors={lead.ai_score_factors}
                scoredAt={lead.ai_scored_at}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Property & Contract</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <GenerateReportButton
                leadId={lead.id}
                existingDocUrl={lead.google_doc_url}
              />
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

        <div className="flex flex-col gap-6">
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
              {lead.contact.do_not_call_at && (
                <ContactDoNotCallControl contactId={lead.contact.id} isAdmin={isAdmin} />
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                {lead.contact.phone && (
                  <ClickToCallButton
                    contactId={lead.contact.id}
                    contactName={contactName || "Contact"}
                    leadId={lead.id}
                    disabled={Boolean(lead.contact.do_not_call_at)}
                  />
                )}
                <SendEmailDialog leadId={lead.id} contactEmail={lead.contact.email} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Previous calls</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {callHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No calls recorded for this lead.</p>
              ) : callHistory.slice(0, 5).map((call) => (
                <div key={call.id} className="flex items-start justify-between gap-3 border-b pb-3 last:border-0 last:pb-0">
                  <div><p className="text-sm font-medium capitalize">{call.status.replace("_", " ")}</p><p className="text-xs text-muted-foreground">{formatWorkspaceDateTime(call.created_at, workspace)} · {call.attempts.length} attempt{call.attempts.length === 1 ? "" : "s"}</p></div>
                  {call.disposition && <Badge variant="secondary">{call.disposition.name}</Badge>}
                </div>
              ))}
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Client</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <ClientAssignmentPanel
                leadId={lead.id}
                clientId={lead.client_id}
                clientInterestStatus={lead.client_interest_status}
                clients={clients}
              />
              {lead.client_id && (
                <ClientCommentThread
                  leadId={lead.id}
                  comments={clientComments}
                  currentUserId={currentUserId}
                  viewerLabel="You"
                  otherLabel="Client"
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
