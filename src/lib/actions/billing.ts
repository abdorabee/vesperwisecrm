"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { requireAdminAccountId } from "@/lib/supabase/account";
import { getBillingState, getBillingSummary } from "@/lib/billing/access";
import {
  BILLING_PLAN_CATALOG,
  type BillingPlan,
} from "@/lib/billing/entitlements";
import {
  createPolarCheckout,
  createPolarCustomerPortalSession,
  updatePolarSubscriptionCancellation,
  updatePolarSubscriptionPlan,
  updatePolarSubscriptionSeats,
} from "@/lib/billing/polar";
import { polarErrorMessage } from "@/lib/billing/polar-errors";

const planSchema = z.enum(["starter", "team", "scale"]);
const seatsSchema = z.number().int().min(1).max(1000);

export type BillingActionResult<T extends object = object> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

function appUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    "http://localhost:3000";
  return configured.startsWith("http") ? configured : `https://${configured}`;
}

async function requestOrigin(): Promise<string> {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  return origin?.startsWith("http") ? origin : appUrl();
}

function assertSeatCapacity(
  memberCount: number,
  pendingInviteCount: number,
  seats: number,
): void {
  const committedSeats = memberCount + pendingInviteCount;
  if (seats < committedSeats) {
    throw new Error(
      `You need at least ${committedSeats} paid seats for current members and pending invitations`,
    );
  }
}

function hasLiveSubscription(summary: { polarSubscriptionId: string | null; providerStatus: string | null }): boolean {
  return Boolean(
    summary.polarSubscriptionId &&
      !["canceled", "revoked", "unpaid", "incomplete_expired"].includes(
        summary.providerStatus ?? "",
      ),
  );
}

function billingFailure(error: unknown, fallback: string): { ok: false; error: string } {
  console.error("[billing]", error);
  const message = polarErrorMessage(error);
  return {
    ok: false,
    error: message === "Billing request failed" ? fallback : message,
  };
}

async function rememberPolarCustomerId(
  accountId: string,
  polarCustomerId: string | null | undefined,
): Promise<void> {
  if (!polarCustomerId) return;
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("billing_accounts")
    .update({
      polar_customer_id: polarCustomerId,
      updated_at: new Date().toISOString(),
    })
    .eq("account_id", accountId)
    .is("polar_customer_id", null);
  if (error) {
    console.error("[billing] failed to persist Polar customer id", error);
  }
}

export async function getBillingSettings() {
  const accountId = await requireAdminAccountId();
  return getBillingSummary(accountId);
}

export async function createBillingCheckout(
  planInput: BillingPlan,
  seatsInput: number,
): Promise<BillingActionResult<{ checkoutUrl: string }>> {
  try {
    const plan = planSchema.parse(planInput);
    const seats = seatsSchema.parse(seatsInput);
    const accountId = await requireAdminAccountId();
    const summary = await getBillingSummary(accountId);

    if (hasLiveSubscription(summary)) {
      return { ok: false, error: "This workspace already has a Polar subscription" };
    }
    assertSeatCapacity(summary.memberCount, summary.pendingInviteCount, seats);

    const supabase = await createClient();
    const [{ data: account, error: accountError }, { data: authData }] =
      await Promise.all([
        supabase.from("accounts").select("name").eq("id", accountId).single(),
        supabase.auth.getUser(),
      ]);

    if (accountError || !account) {
      return { ok: false, error: accountError?.message ?? "Account not found" };
    }

    const origin = await requestOrigin();
    const checkout = await createPolarCheckout({
      accountId,
      plan,
      seats,
      customerEmail: authData.user?.email,
      customerName: account.name,
      successUrl: `${origin}/settings/billing?checkout=success`,
      returnUrl: `${origin}/settings/billing`,
    });
    await rememberPolarCustomerId(accountId, checkout.polarCustomerId);

    return { ok: true, checkoutUrl: checkout.url };
  } catch (error) {
    return billingFailure(error, "Could not create checkout");
  }
}

export async function createCustomerPortalSession(): Promise<
  BillingActionResult<{ url: string }>
> {
  try {
    const accountId = await requireAdminAccountId();
    const state = await getBillingState(accountId);
    const supabase = await createClient();
    const [{ data: account }, { data: authData }] = await Promise.all([
      supabase.from("accounts").select("name").eq("id", accountId).single(),
      supabase.auth.getUser(),
    ]);

    const origin = await requestOrigin();
    const session = await createPolarCustomerPortalSession({
      accountId,
      polarCustomerId: state.polarCustomerId,
      customerEmail: authData.user?.email,
      customerName: account?.name,
      returnUrl: `${origin}/settings/billing`,
    });
    await rememberPolarCustomerId(accountId, session.polarCustomerId);

    return { ok: true, url: session.url };
  } catch (error) {
    return billingFailure(error, "Could not open the billing portal");
  }
}

export async function changeBillingPlan(
  planInput: BillingPlan,
): Promise<BillingActionResult> {
  try {
    const plan = planSchema.parse(planInput);
    if (!BILLING_PLAN_CATALOG[plan].checkoutEnabled || plan === "scale") {
      return { ok: false, error: "Scale plan changes are not enabled yet" };
    }

    const accountId = await requireAdminAccountId();
    const state = await getBillingState(accountId);
    if (!state.polarSubscriptionId) {
      return { ok: false, error: "No Polar subscription is connected to this workspace" };
    }

    if (state.cancelAtPeriodEnd) {
      await updatePolarSubscriptionCancellation({
        subscriptionId: state.polarSubscriptionId,
        cancelAtPeriodEnd: false,
      });
    }
    await updatePolarSubscriptionPlan({
      subscriptionId: state.polarSubscriptionId,
      plan,
    });
    revalidatePath("/settings/billing");
    return { ok: true };
  } catch (error) {
    return billingFailure(error, "Could not change plan");
  }
}

export async function changeBillingSeats(
  seatsInput: number,
): Promise<BillingActionResult> {
  try {
    const seats = seatsSchema.parse(seatsInput);
    const accountId = await requireAdminAccountId();
    const summary = await getBillingSummary(accountId);
    if (!summary.polarSubscriptionId) {
      return { ok: false, error: "No Polar subscription is connected to this workspace" };
    }
    assertSeatCapacity(summary.memberCount, summary.pendingInviteCount, seats);

    await updatePolarSubscriptionSeats({
      subscriptionId: summary.polarSubscriptionId,
      seats,
    });
    revalidatePath("/settings/billing");
    return { ok: true };
  } catch (error) {
    return billingFailure(error, "Could not update seats");
  }
}

export async function cancelBillingAtPeriodEnd(): Promise<BillingActionResult> {
  try {
    const accountId = await requireAdminAccountId();
    const state = await getBillingState(accountId);
    if (!state.polarSubscriptionId) {
      return { ok: false, error: "No Polar subscription is connected to this workspace" };
    }

    await updatePolarSubscriptionCancellation({
      subscriptionId: state.polarSubscriptionId,
      cancelAtPeriodEnd: true,
    });
    revalidatePath("/settings/billing");
    return { ok: true };
  } catch (error) {
    return billingFailure(error, "Could not schedule cancellation");
  }
}
