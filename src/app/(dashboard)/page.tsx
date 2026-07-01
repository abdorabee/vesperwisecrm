import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardStats } from "@/lib/queries/reporting";

export default async function DashboardPage() {
  const stats = await getDashboardStats();
  const maxStageCount = Math.max(1, ...stats.leadsByStage.map((s) => s.count));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Button render={<Link href="/pipeline" />} nativeButton={false}>
          Go to pipeline
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Total leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">{stats.totalLeads}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Created this week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">{stats.leadsThisWeek}</p>
          </CardContent>
        </Card>
      </div>

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
    </div>
  );
}
