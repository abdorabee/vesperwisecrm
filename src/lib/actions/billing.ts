"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
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

const planSchema = z.enum(["starter", "team", "scale"]);
const seatsSchema = z.number().int().min(1).max(1000);

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

export async function getBillingSettings() {
  const accountId = await requireAdminAccountId();
  return getBillingSummary(accountId);
}

export async function createBillingCheckout(
  planInput: BillingPlan,
  seatsInput: number,
): Promise<{ checkoutUrl: string }> {
  const plan = planSchema.parse(planInput);
  const seats = seatsSchema.parse(seatsInput);
  const accountId = await requireAdminAccountId();
  const summary = await getBillingSummary(accountId);

  if (hasLiveSubscription(summary)) {
    throw new Error("This workspace already has a Polar subscription");
  }
  assertSeatCapacity(summary.memberCount, summary.pendingInviteCount, seats);

  const supabase = await createClient();
  const [{ data: account, error: accountError }, { data: authData }] =
    await Promise.all([
      supabase.from("accounts").select("name").eq("id", accountId).single(),
      supabase.auth.getUser(),
    ]);

  if (accountError || !account) {
    throw new Error(accountError?.message ?? "Account not found");
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

  return { checkoutUrl: checkout.url };
}

export async function createCustomerPortalSession(): Promise<{ url: string }> {
  const accountId = await requireAdminAccountId();
  const state = await getBillingState(accountId);
  if (!state.polarCustomerId && !state.polarSubscriptionId) {
    throw new Error("No Polar customer is connected to this workspace");
  }

  const origin = await requestOrigin();
  return createPolarCustomerPortalSession({
    accountId,
    polarCustomerId: state.polarCustomerId,
    returnUrl: `${origin}/settings/billing`,
  });
}

export async function changeBillingPlan(planInput: BillingPlan): Promise<void> {
  const plan = planSchema.parse(planInput);
  if (!BILLING_PLAN_CATALOG[plan].checkoutEnabled || plan === "scale") {
    throw new Error("Scale plan changes are not enabled yet");
  }

  const accountId = await requireAdminAccountId();
  const state = await getBillingState(accountId);
  if (!state.polarSubscriptionId) {
    throw new Error("No Polar subscription is connected to this workspace");
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
}

export async function changeBillingSeats(seatsInput: number): Promise<void> {
  const seats = seatsSchema.parse(seatsInput);
  const accountId = await requireAdminAccountId();
  const summary = await getBillingSummary(accountId);
  if (!summary.polarSubscriptionId) {
    throw new Error("No Polar subscription is connected to this workspace");
  }
  assertSeatCapacity(summary.memberCount, summary.pendingInviteCount, seats);

  await updatePolarSubscriptionSeats({
    subscriptionId: summary.polarSubscriptionId,
    seats,
  });
  revalidatePath("/settings/billing");
}

export async function cancelBillingAtPeriodEnd(): Promise<void> {
  const accountId = await requireAdminAccountId();
  const state = await getBillingState(accountId);
  if (!state.polarSubscriptionId) {
    throw new Error("No Polar subscription is connected to this workspace");
  }

  await updatePolarSubscriptionCancellation({
    subscriptionId: state.polarSubscriptionId,
    cancelAtPeriodEnd: true,
  });
  revalidatePath("/settings/billing");
}
