import { getUserScorecard } from "@/lib/queries/reporting";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ScorecardPage() {
  const stats = await getUserScorecard();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">My scorecard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Open leads owned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">{stats.openLeadsOwned}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              New this week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">{stats.leadsCreatedThisWeek}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Touches this week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">{stats.activitiesThisWeek}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Win rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">
              {stats.winRate != null ? `${Math.round(stats.winRate * 100)}%` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Avg. days to won
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">
              {stats.avgDaysToWon != null ? stats.avgDaysToWon.toFixed(1) : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Sequence steps sent this week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">
              {stats.sequenceStepsSentThisWeek}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
