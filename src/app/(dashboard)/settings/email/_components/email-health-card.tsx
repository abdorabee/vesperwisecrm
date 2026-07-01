import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { EmailHealthStats } from "@/lib/queries/email-health";
import type { EmailSetupUiState } from "@/lib/email/account-settings";

interface EmailHealthCardProps {
  uiState: EmailSetupUiState;
  lastTestSentAt: string | null;
  outboundSuspended: boolean;
  stats: EmailHealthStats;
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString();
}

export function EmailHealthCard({
  uiState,
  lastTestSentAt,
  outboundSuspended,
  stats,
}: EmailHealthCardProps) {
  const statusLabel =
    uiState === "verified"
      ? "Verified"
      : uiState === "failed"
        ? "Failed"
        : uiState === "pending_dns"
          ? "Pending DNS"
          : "Not started";

  const statusVariant =
    uiState === "verified"
      ? "default"
      : uiState === "failed"
        ? "destructive"
        : "secondary";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email health</CardTitle>
        <CardDescription>
          Delivery metrics for your account. Fix DNS in the domain section above
          if verification failed.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Domain status</span>
          <Badge variant={statusVariant}>{statusLabel}</Badge>
          {outboundSuspended && (
            <Badge variant="destructive">Outbound suspended</Badge>
          )}
        </div>

        <p className="text-sm text-muted-foreground">
          Last test send:{" "}
          {lastTestSentAt ? formatRelativeTime(lastTestSentAt) : "Never"}
        </p>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatTile label="Sent (7d)" value={stats.outbound7d} />
          <StatTile label="Sent (30d)" value={stats.outbound30d} />
          <StatTile label="Bounces (7d)" value={stats.bounces7d} />
          <StatTile label="Bounces (30d)" value={stats.bounces30d} />
          <StatTile label="Complaints (7d)" value={stats.complaints7d} />
          <StatTile label="Complaints (30d)" value={stats.complaints30d} />
        </div>

        {(uiState === "failed" || uiState === "pending_dns") && (
          <p className="text-sm">
            <a href="#domain-verification" className="text-primary underline">
              Review DNS records
            </a>{" "}
            to complete domain verification.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border px-3 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-3xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
