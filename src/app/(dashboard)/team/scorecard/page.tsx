import { getTeamScorecard } from "@/lib/queries/reporting";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function TeamScorecardPage() {
  const entries = await getTeamScorecard();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Employee scorecard</h1>
      <p className="text-sm text-muted-foreground">
        Real-time performance across the team, ranked by open leads owned.
      </p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead>Open leads</TableHead>
            <TableHead>New this week</TableHead>
            <TableHead>Touches this week</TableHead>
            <TableHead>Win rate</TableHead>
            <TableHead>Avg. days to won</TableHead>
            <TableHead>Sequence sends this week</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.userId}>
              <TableCell>
                <div className="flex items-center gap-2">
                  {entry.email}
                  <Badge variant="secondary" className="text-[10px]">
                    {entry.role}
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="tabular-nums">{entry.openLeadsOwned}</TableCell>
              <TableCell className="tabular-nums">{entry.leadsCreatedThisWeek}</TableCell>
              <TableCell className="tabular-nums">{entry.activitiesThisWeek}</TableCell>
              <TableCell className="tabular-nums">
                {entry.winRate != null ? `${Math.round(entry.winRate * 100)}%` : "—"}
              </TableCell>
              <TableCell className="tabular-nums">
                {entry.avgDaysToWon != null ? entry.avgDaysToWon.toFixed(1) : "—"}
              </TableCell>
              <TableCell className="tabular-nums">{entry.sequenceStepsSentThisWeek}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
