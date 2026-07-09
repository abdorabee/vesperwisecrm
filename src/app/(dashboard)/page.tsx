import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAtRiskLeads, getDashboardStats } from "@/lib/queries/reporting";
import { getYourDayTasks } from "@/lib/queries/tasks";
import { YourDay } from "./_components/your-day";

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
  const [stats, yourDayTasks, atRiskLeads] = await Promise.all([
    getDashboardStats(),
    getYourDayTasks(),
    getAtRiskLeads(),
  ]);
  const maxStageCount = Math.max(1, ...stats.leadsByStage.map((s) => s.count));
  const maxSourceCount = Math.max(1, ...stats.leadsBySource.map((s) => s.count));
  const maxDailyActivityCount = Math.max(
    1,
    ...stats.activitiesByDay.map((day) => day.count),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Button render={<Link href="/pipeline" />} nativeButton={false}>
          Go to pipeline
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Day</CardTitle>
        </CardHeader>
        <CardContent>
          <YourDay tasks={yourDayTasks} />
        </CardContent>
      </Card>

      {atRiskLeads.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <AlertTriangle className="size-4" />
              At risk — no next action ({atRiskLeads.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col divide-y divide-border">
              {atRiskLeads.slice(0, 8).map((lead) => (
                <Link
                  key={lead.id}
                  href={`/leads/${lead.id}`}
                  className="flex items-center justify-between gap-3 py-2 text-sm hover:underline"
                >
                  <span className="truncate">{lead.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    Created {new Date(lead.createdAt).toLocaleDateString()}
                  </span>
                </Link>
              ))}
            </div>
            {atRiskLeads.length > 8 && (
              <p className="mt-2 text-xs text-muted-foreground">
                +{atRiskLeads.length - 8} more open leads with no scheduled follow-up.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Total leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mt-1 text-3xl font-semibold tabular-nums">{stats.totalLeads}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Created this week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mt-1 text-3xl font-semibold tabular-nums">{stats.leadsThisWeek}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Avg touches / lead
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mt-1 text-3xl font-semibold tabular-nums">
              {formatDecimal(stats.averageTouchesPerLead)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Close rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mt-1 text-3xl font-semibold tabular-nums">
              {formatPercent(stats.closeRate)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {stats.wonLeads} won / {stats.closedLeads} closed
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 lg:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leads by stage</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.leadsByStage.length === 0 ? (
              <p className="text-sm text-muted-foreground">No stages yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {stats.leadsByStage.map((stage) => (
                  <div key={stage.stageId} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 truncate text-sm">
                      {stage.stageName}
                    </span>
                    <div className="h-2 flex-1 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{
                          width: `${(stage.count / maxStageCount) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="w-6 shrink-0 text-right text-sm text-muted-foreground tabular-nums">
                      {stage.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leads by source</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.leadsBySource.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Source attribution appears after leads are imported or captured.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {stats.leadsBySource.slice(0, 8).map((source) => (
                  <div key={source.source} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 truncate text-sm">
                      {source.source}
                    </span>
                    <div className="h-2 flex-1 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{
                          width: `${(source.count / maxSourceCount) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="w-6 shrink-0 text-right text-sm text-muted-foreground tabular-nums">
                      {source.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily lead touches</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.activitiesByDay.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Touch activity will appear as notes, emails, SMS, and lead updates are logged.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {stats.activitiesByDay.map((day) => (
                <div key={day.date} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 text-sm">
                    {new Intl.DateTimeFormat("en", {
                      month: "short",
                      day: "numeric",
                    }).format(new Date(`${day.date}T00:00:00Z`))}
                  </span>
                  <div className="h-2 flex-1 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{
                        width: `${(day.count / maxDailyActivityCount) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="w-6 shrink-0 text-right text-sm text-muted-foreground tabular-nums">
                    {day.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
