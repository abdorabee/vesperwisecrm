import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { BarList } from "@/components/bar-list";
import { ColumnChart } from "@/components/column-chart";
import { PageHeader } from "@/components/page-header";
import { StatTile } from "@/components/stat-tile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAtRiskLeads, getDashboardStats } from "@/lib/queries/reporting";
import { getYourDayTasks } from "@/lib/queries/tasks";
import { getAccountMemberProfiles } from "@/lib/queries/members";
import { getCurrentMembership, isAdminRole } from "@/lib/queries/members";
import { getWorkspaceSettings } from "@/lib/queries/workspace-settings";
import { getAccountEmailSettingsForAdmin } from "@/lib/queries/account-email";
import { getDialerCredentialStatus } from "@/lib/queries/dialer-credentials";
import { isAccountEmailReady } from "@/lib/email/account-settings";
import { formatWorkspaceDate } from "@/lib/workspace-settings";
import { YourDay } from "./_components/your-day";
import { GettingStartedChecklist } from "./_components/getting-started-checklist";

const AT_RISK_PREVIEW_COUNT = 8;

function formatDecimal(value: number | null): string {
  if (value == null) {
    return "—";
  }

  return value.toFixed(1);
}

function formatPercent(value: number | null): string {
  if (value == null) {
    return "—";
  }

  return `${Math.round(value * 100)}%`;
}

export default async function DashboardPage() {
  const [stats, yourDayTasks, atRiskLeads, members, membership, workspace] = await Promise.all([
    getDashboardStats(),
    getYourDayTasks(),
    getAtRiskLeads(),
    getAccountMemberProfiles(),
    getCurrentMembership(),
    getWorkspaceSettings(),
  ]);
  const isAdmin = membership ? isAdminRole(membership.role) : false;
  const [emailSettings, dialerCredentials] = isAdmin
    ? await Promise.all([getAccountEmailSettingsForAdmin(), getDialerCredentialStatus()])
    : [null, null];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="Pipeline health, the work waiting on you, and how much the team is touching leads."
        actions={
          <Button render={<Link href="/pipeline" />} nativeButton={false}>
            Go to pipeline
            <ArrowRight data-icon="inline-end" />
          </Button>
        }
      />

      <GettingStartedChecklist
        isAdmin={isAdmin}
        workspaceReviewed={workspace.name.trim().length > 0}
        hasTeammates={members.length > 1}
        hasLeads={stats.totalLeads > 0}
        emailConnected={isAccountEmailReady(emailSettings)}
        callingConnected={Boolean(dialerCredentials?.connected && dialerCredentials.status === "active")}
      />

      <Card>
        <CardHeader>
          <CardTitle>Your day</CardTitle>
        </CardHeader>
        <CardContent>
          <YourDay tasks={yourDayTasks} />
        </CardContent>
      </Card>

      {atRiskLeads.length > 0 && (
        <Card tone="destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-4" strokeWidth={2} />
              At risk — no next action ({atRiskLeads.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col divide-y divide-border">
              {atRiskLeads.slice(0, AT_RISK_PREVIEW_COUNT).map((lead) => (
                <Link
                  key={lead.id}
                  href={`/leads/${lead.id}`}
                  className="flex items-center justify-between gap-3 py-2 text-sm hover:underline"
                >
                  <span className="truncate">{lead.title}</span>
                  <span className="numeric shrink-0 text-xs text-muted-foreground">
                    Created {formatWorkspaceDate(lead.createdAt, workspace)}
                  </span>
                </Link>
              ))}
            </div>
            {atRiskLeads.length > AT_RISK_PREVIEW_COUNT && (
              <p className="mt-2 text-xs text-muted-foreground">
                +{atRiskLeads.length - AT_RISK_PREVIEW_COUNT} more open leads with no scheduled follow-up.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        <StatTile label="Total leads" value={stats.totalLeads} />
        <StatTile label="Created this week" value={stats.leadsThisWeek} />
        <StatTile
          label="Avg touches / lead"
          value={formatDecimal(stats.averageTouchesPerLead)}
        />
        <StatTile
          label="Close rate"
          value={formatPercent(stats.closeRate)}
          hint={`${stats.wonLeads} won / ${stats.closedLeads} closed`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Leads by stage</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList
              emptyMessage="Stages appear here once the pipeline has been set up."
              items={stats.leadsByStage.map((stage) => ({
                id: stage.stageId,
                label: stage.stageName,
                value: stage.count,
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leads by source</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList
              emptyMessage="Source attribution appears after leads are imported or captured."
              items={stats.leadsBySource.slice(0, 8).map((source) => ({
                id: source.source,
                label: source.source,
                value: source.count,
              }))}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily lead touches</CardTitle>
        </CardHeader>
        <CardContent>
          <ColumnChart
            valueLabel="touches"
            emptyMessage="Touch activity will appear as notes, emails, SMS, and lead updates are logged."
            points={stats.activitiesByDay.map((day) => ({
              id: day.date,
              label: formatWorkspaceDate(`${day.date}T00:00:00Z`, workspace),
              value: day.count,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
