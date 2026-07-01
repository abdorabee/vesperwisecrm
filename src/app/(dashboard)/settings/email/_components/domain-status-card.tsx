"use client";

import { useState } from "react";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { refreshDomainVerification } from "@/lib/actions/account-email";
import type { EmailSetupUiState } from "@/lib/email/account-settings";

interface DomainStatusCardProps {
  uiState: EmailSetupUiState;
  sendingDomain: string | null;
}

const statusLabels: Record<EmailSetupUiState, string> = {
  not_started: "Not started",
  pending_dns: "Pending DNS",
  verified: "Verified",
  failed: "Failed",
};

const statusVariants: Record<
  EmailSetupUiState,
  "default" | "secondary" | "destructive" | "outline"
> = {
  not_started: "outline",
  pending_dns: "secondary",
  verified: "default",
  failed: "destructive",
};

const statusIcons: Record<EmailSetupUiState, typeof CheckCircle2> = {
  not_started: Clock,
  pending_dns: Clock,
  verified: CheckCircle2,
  failed: XCircle,
};

export function DomainStatusCard({
  uiState,
  sendingDomain,
}: DomainStatusCardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const StatusIcon = statusIcons[uiState];

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      await refreshDomainVerification();
      toast.success("Verification status updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to refresh status",
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <StatusIcon className="size-4 shrink-0 text-muted-foreground" />
        <Badge variant={statusVariants[uiState]}>{statusLabels[uiState]}</Badge>
        {sendingDomain && (
          <span className="text-sm text-muted-foreground">{sendingDomain}</span>
        )}
      </div>
      {sendingDomain && uiState !== "not_started" && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <>
              <Loader2 className="size-4 motion-reduce:animate-none animate-spin" />
              Checking...
            </>
          ) : (
            "Refresh verification"
          )}
        </Button>
      )}
    </div>
  );
}
