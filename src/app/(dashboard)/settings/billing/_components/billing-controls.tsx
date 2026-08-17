"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, ExternalLink, LockKeyhole } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SettingsSection } from "@/components/settings/settings-primitives";
import {
  BILLING_PLAN_CATALOG,
  type BillingPlan,
} from "@/lib/billing/entitlements";
import type { BillingSummary } from "@/lib/billing/access";
import {
  cancelBillingAtPeriodEnd,
  changeBillingPlan,
  changeBillingSeats,
  createBillingCheckout,
  createCustomerPortalSession,
  type BillingActionResult,
} from "@/lib/actions/billing";
import { clientBillingErrorMessage } from "@/lib/billing/polar-errors";

const PLAN_LABELS: Record<BillingPlan, string> = {
  starter: "Starter",
  team: "Team",
  scale: "Scale",
};

const CAPABILITY_LABELS: Record<string, string> = {
  pipeline: "Pipeline",
  queue: "Review queue",
  sequences: "Sequences",
  dialer: "Dialer",
  ai: "AI scoring and summaries",
  workflows: "Workflows",
  routing: "Routing",
  multi_market_reporting: "Multi-market reporting",
  api_sync: "API and data-warehouse sync",
  sso: "SSO",
  audit_log: "Audit log",
  skip_tracing: "Skip tracing",
  dedicated_onboarding: "Dedicated onboarding",
};

function statusLabel(summary: BillingSummary): string {
  if (summary.accessMode === "billing_required") return "Plan required";
  if (summary.accessMode === "read_only") return "Read-only";
  if (summary.cancelAtPeriodEnd) return "Cancels at period end";
  if (summary.providerStatus === "past_due") return "Past due · grace period";
  if (summary.providerStatus === "trialing") return "Trialing";
  if (summary.source === "grandfathered") return "Grandfathered Starter";
  return summary.providerStatus ? summary.providerStatus.replaceAll("_", " ") : "Active";
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(value),
  );
}

export function BillingControls({ summary }: { summary: BillingSummary }) {
  const [pending, startTransition] = useTransition();
  const [seats, setSeats] = useState(String(summary.seats));
  const committedSeats = summary.memberCount + summary.pendingInviteCount;

  function run(
    action: () => Promise<BillingActionResult>,
    successMessage: string,
    fallbackError: string,
  ) {
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success(successMessage);
      } catch (error) {
        toast.error(clientBillingErrorMessage(error, fallbackError));
      }
    });
  }

  function checkout(plan: BillingPlan) {
    const quantity = Number(seats);
    if (!Number.isInteger(quantity) || quantity < 1) {
      toast.error("Enter a valid seat count before checkout");
      return;
    }
    startTransition(async () => {
      try {
        const result = await createBillingCheckout(plan, quantity);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        window.location.assign(result.checkoutUrl);
      } catch (error) {
        toast.error(clientBillingErrorMessage(error, "Could not create checkout"));
      }
    });
  }

  function openPortal() {
    startTransition(async () => {
      try {
        const result = await createCustomerPortalSession();
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        window.location.assign(result.url);
      } catch (error) {
        toast.error(clientBillingErrorMessage(error, "Could not open the billing portal"));
      }
    });
  }

  const activePlanLabel = summary.plan
    ? PLAN_LABELS[summary.plan]
    : "No plan selected";
  const subscriptionLive = Boolean(
    summary.polarSubscriptionId &&
      !["canceled", "revoked", "unpaid", "incomplete_expired"].includes(
        summary.providerStatus ?? "",
      ),
  );
  const canCheckout = !subscriptionLive;
  const activeCapabilities = summary.plan
    ? BILLING_PLAN_CATALOG[summary.plan].capabilities
    : [];

  return (
    <div className="mt-2">
      <SettingsSection title="Current plan" description="Billing state is synchronized from Polar webhooks.">
        <div className="rounded-xl border border-border bg-muted/20 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold">{activePlanLabel}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {summary.source === "polar" ? "Polar subscription" : "Workspace access"}
              </p>
            </div>
            <Badge variant={summary.accessMode === "full" ? "default" : "secondary"}>
              {statusLabel(summary)}
            </Badge>
          </div>
          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
            <div><dt className="text-muted-foreground">Renewal</dt><dd className="mt-1 font-medium">{formatDate(summary.currentPeriodEnd)}</dd></div>
            <div><dt className="text-muted-foreground">Seats</dt><dd className="mt-1 font-medium">{summary.memberCount} members · {summary.pendingInviteCount} pending · {summary.seats} paid</dd></div>
            <div><dt className="text-muted-foreground">Starter lead usage</dt><dd className="mt-1 font-medium">{summary.leadLimit == null ? `${summary.leadUsage} · unlimited` : `${summary.leadUsage} / ${summary.leadLimit} this UTC month`}</dd></div>
            <div><dt className="text-muted-foreground">Cancellation</dt><dd className="mt-1 font-medium">{summary.cancelAtPeriodEnd ? `Ends ${formatDate(summary.currentPeriodEnd)}` : "Not scheduled"}</dd></div>
          </dl>
        </div>
      </SettingsSection>

      <SettingsSection title="Seats" description="Paid seats must cover current members and pending invitations.">
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1.5 text-sm">
            <span className="text-muted-foreground">Paid seats</span>
            <input
              type="number"
              min={committedSeats || 1}
              max={1000}
              value={seats}
              onChange={(event) => setSeats(event.target.value)}
              className="h-9 w-28 rounded-lg border border-border bg-background px-3 text-sm"
              disabled={pending}
            />
          </label>
          <Button
            type="button"
            variant="outline"
            disabled={pending || !subscriptionLive || Number(seats) === summary.seats}
            onClick={() =>
              run(
                () => changeBillingSeats(Number(seats)),
                "Seat quantity update requested",
                "Could not update seats",
              )
            }
          >
            Update seats
          </Button>
        </div>
      </SettingsSection>

      <SettingsSection title="Included capabilities" description="Capabilities are enforced on the server for every plan.">
        <div className="grid gap-2 sm:grid-cols-2">
          {activeCapabilities.map((capability) => (
            <div key={capability} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
              <Check className="size-4 text-emerald-600" aria-hidden="true" />
              {CAPABILITY_LABELS[capability] ?? capability}
            </div>
          ))}
          {activeCapabilities.length === 0 && (
            <p className="text-sm text-muted-foreground">Choose Starter or Team to activate workspace capabilities.</p>
          )}
        </div>
        {summary.accessMode === "read_only" && (
          <p className="mt-4 flex items-start gap-2 rounded-lg border border-amber-300/50 bg-amber-50/50 p-3 text-sm text-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
            <LockKeyhole className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            Billing controls remain available while CRM writes are paused. Restore payment or contact support to return to full access.
          </p>
        )}
      </SettingsSection>

      <SettingsSection title="Choose or change plan" description="Starter and Team checkout are enabled. Scale remains visible for planning but checkout is intentionally locked until its capabilities are verified.">
        <div className="grid gap-3 sm:grid-cols-2">
          {(["starter", "team", "scale"] as BillingPlan[]).map((plan) => {
            const current = summary.plan === plan && subscriptionLive;
            const enabled = BILLING_PLAN_CATALOG[plan].checkoutEnabled && (canCheckout || !current);
            return (
              <div key={plan} className="rounded-xl border border-border p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{PLAN_LABELS[plan]}</p>
                  {current && <Badge variant="secondary">Current</Badge>}
                </div>
                <p className="mt-2 min-h-10 text-sm text-muted-foreground">
                  {plan === "starter" ? "Pipeline, review queue, sequences, and 1,000 leads per UTC month." : plan === "team" ? "Starter benefits plus dialer, AI, workflows, routing, and unlimited leads." : "Team benefits plus Scale-only capabilities. Checkout is not enabled yet."}
                </p>
                <Button
                  type="button"
                  className="mt-4 w-full"
                  variant={current ? "secondary" : "outline"}
                  disabled={pending || current || !enabled}
                  onClick={() =>
                    canCheckout
                      ? checkout(plan)
                      : run(
                          () => changeBillingPlan(plan),
                          `Plan change to ${PLAN_LABELS[plan]} requested`,
                          "Could not change plan",
                        )
                  }
                >
                  {current ? "Current plan" : !enabled ? "Coming soon" : canCheckout ? `Checkout ${PLAN_LABELS[plan]}` : `Change to ${PLAN_LABELS[plan]}`}
                </Button>
              </div>
            );
          })}
        </div>
      </SettingsSection>

      <SettingsSection title="Billing portal" description="Use Polar for payment methods, invoices, receipts, and customer-managed billing details.">
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" disabled={pending} onClick={openPortal}>
            <ExternalLink className="size-4" aria-hidden="true" />
            Open Polar portal
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending || !subscriptionLive || summary.cancelAtPeriodEnd}
            onClick={() =>
              run(
                cancelBillingAtPeriodEnd,
                "Cancellation scheduled at period end",
                "Could not schedule cancellation",
              )
            }
          >
            {summary.cancelAtPeriodEnd ? "Cancellation scheduled" : "Cancel at period end"}
          </Button>
        </div>
        {!summary.polarCustomerId && !summary.polarSubscriptionId && (
          <p className="mt-3 text-sm text-muted-foreground">
            Opens Polar using this workspace email. Complete checkout to attach invoices and payment methods.
          </p>
        )}
      </SettingsSection>
    </div>
  );
}
