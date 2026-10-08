import { NextResponse } from "next/server";
import { getDialerProvider } from "@/lib/dialer/providers/registry";
import { isDialerEnabled } from "@/lib/dialer/config";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { logDialerEvent } from "@/lib/dialer/logger";
import { isAuthorizedCronRequest } from "@/lib/cron/authorize";
import { billingStateFromRow, hasWritableBillingAccess } from "@/lib/billing/access";

export const runtime = "nodejs";
export const maxDuration = 50;

export async function GET(request: Request): Promise<NextResponse> {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDialerEnabled()) return NextResponse.json({ ok: true, disabled: true });

  const supabase = createServiceRoleClient();
  const { data: billingAccounts } = await supabase.from("billing_accounts").select("*");
  const writableAccounts = new Set(
    (billingAccounts ?? [])
      .filter((row) => hasWritableBillingAccess(billingStateFromRow(row)))
      .map((row) => row.account_id),
  );
  const cutoff = new Date(Date.now() - 90_000).toISOString();
  const { data: attempts, error } = await supabase
    .from("call_attempts")
    .select("id, account_id, provider, status, provider_parent_call_id, provider_call_id, last_provider_sequence")
    .in("status", ["initiating", "ringing", "answered"])
    .lt("updated_at", cutoff)
    .order("updated_at")
    .limit(50);
  if (error) return NextResponse.json({ error: "Query failed" }, { status: 500 });

  let repaired = 0;
  let unchanged = 0;
  let failed = 0;
  const provider = getDialerProvider();
  for (const attempt of attempts ?? []) {
    if (!writableAccounts.has(attempt.account_id)) {
      unchanged += 1;
      continue;
    }
    try {
      const providerCallId = attempt.provider_call_id ?? attempt.provider_parent_call_id;
      const sequence = attempt.last_provider_sequence + 1;
      if (!providerCallId) {
        const { error: processError } = await supabase.rpc("process_dialer_provider_event", {
          p_attempt_id: attempt.id,
          p_provider_call_id: "",
          p_provider_event_key: `reconcile:${attempt.id}:unattached`,
          p_provider_sequence: sequence,
          p_event_type: "system.reconcile_unattached",
          p_status: "failed",
          p_failure_code: "provider_call_not_attached",
          p_failure_reason: "The provider did not attach a call before the reservation expired",
          p_payload: { reconciliation: true },
          p_occurred_at: new Date().toISOString(),
        });
        if (processError) throw processError;
        repaired += 1;
        continue;
      }

      const current = await provider.getCallStatus(attempt.account_id, providerCallId);
      if (current.status === attempt.status) {
        unchanged += 1;
        continue;
      }
      const { error: processError } = await supabase.rpc("process_dialer_provider_event", {
        p_attempt_id: attempt.id,
        p_provider_call_id: providerCallId,
        p_provider_event_key: `reconcile:${providerCallId}:${current.status}:${sequence}`,
        p_provider_sequence: sequence,
        p_event_type: "system.reconciled",
        p_status: current.status,
        p_failure_code: current.failureCode ?? "",
        p_failure_reason: current.failureReason ?? "",
        p_payload: { reconciliation: true },
        p_occurred_at: current.occurredAt,
      });
      if (processError) throw processError;
      repaired += 1;
    } catch (reconcileError) {
      failed += 1;
      logDialerEvent("error", "reconciliation_failed", {
        accountId: attempt.account_id,
        attemptId: attempt.id,
        code: reconcileError instanceof Error ? reconcileError.name : "unknown",
      });
    }
  }
  return NextResponse.json({ ok: true, checked: attempts?.length ?? 0, repaired, unchanged, failed });
}
