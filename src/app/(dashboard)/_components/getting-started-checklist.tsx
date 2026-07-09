import Link from "next/link";
import { PhoneCall, Upload, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface GettingStartedChecklistProps {
  hasTeammates: boolean;
}

export function GettingStartedChecklist({
  hasTeammates,
}: GettingStartedChecklistProps) {
  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="text-base">Getting started</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Link
          href="/intake"
          className="flex items-center gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/50"
        >
          <PhoneCall className="size-4 shrink-0 text-primary" />
          <div>
            <p className="font-medium">Submit your first lead</p>
            <p className="text-xs text-muted-foreground">
              Try the caller quick-intake form
            </p>
          </div>
        </Link>
        <Link
          href="/pipeline"
          className="flex items-center gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/50"
        >
          <Upload className="size-4 shrink-0 text-primary" />
          <div>
            <p className="font-medium">Import your existing leads</p>
            <p className="text-xs text-muted-foreground">
              Bring in a CSV from your old CRM — map columns to fields
            </p>
          </div>
        </Link>
        {!hasTeammates && (
          <Link
            href="/team"
            className="flex items-center gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/50"
          >
            <Users className="size-4 shrink-0 text-primary" />
            <div>
              <p className="font-medium">Invite your team</p>
              <p className="text-xs text-muted-foreground">
                Add cold callers, lead managers, and acquisitions
              </p>
            </div>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
