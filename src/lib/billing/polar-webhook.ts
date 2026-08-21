import "server-only";

import type { Json } from "@/lib/supabase/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getBillingConfig } from "@/lib/billing/config";
import {
  isProviderUpdateStale,
  normalizePolarEvent,
  type NormalizedPolarEvent,
} from "@/lib/billing/polar-events";

function serializeEvent(event: unknown): Json {
  return JSON.parse(JSON.stringify(event)) as Json;
}

async function processSubscriptionEvent(
  normalized: Extract<NormalizedPolarEvent, { kind: "subscription" }>,
  supabase: ReturnType<typeof createServiceRoleClient>,
): Promise<void> {
  if (!normalized.subscription || !normalized.accountId) {
    throw new Error("Polar subscription event is incomplete");
  }

  const { data: existing, error: existingError } = await supabase
    .from("billing_accounts")
    .select("last_provider_modified_at")
    .eq("account_id", normalized.accountId)
    .single();

  if (existingError) {
    if (existingError.code === "PGRST116") {
      return;
    }
    throw new Error(existingError.message);
  }
  if (!existing) {
    return;
  }

  if (
    isProviderUpdateStale(
      normalized.providerModifiedAt,
      existing.last_provider_modified_at,
    )
  ) {
    return;
  }

  const { error } = await supabase
    .from("billing_accounts")
    .update({
      source: "polar",
      plan_key: normalized.subscription.plan,
      provider_status: normalized.subscription.providerStatus,
      polar_customer_id: normalized.subscription.polarCustomerId,
      polar_subscription_id: normalized.subscription.id,
      polar_product_id: normalized.subscription.polarProductId,
      seats: normalized.subscription.seats,
      current_period_start: normalized.subscription.currentPeriodStart,
      current_period_end: normalized.subscription.currentPeriodEnd,
      trial_start: normalized.subscription.trialStart,
      trial_end: normalized.subscription.trialEnd,
      cancel_at_period_end: normalized.subscription.cancelAtPeriodEnd,
      past_due_since: normalized.subscription.pastDueSince,
      last_provider_modified_at: normalized.providerModifiedAt,
      updated_at: new Date().toISOString(),
    })
    .eq("account_id", normalized.accountId);

  if (error) {
    throw new Error(error.message);
  }
}

async function processPaidOrderEvent(
  normalized: Extract<NormalizedPolarEvent, { kind: "order_paid" }>,
  supabase: ReturnType<typeof createServiceRoleClient>,
): Promise<void> {
  if (!normalized.order || !normalized.accountId) {
    throw new Error("Polar paid order event is incomplete");
  }

  const { data: existing, error: existingError } = await supabase
    .from("billing_accounts")
    .select("polar_subscription_id, provider_status, last_provider_modified_at")
    .eq("account_id", normalized.accountId)
    .single();

  if (existingError) {
    if (existingError.code === "PGRST116") {
      return;
    }
    throw new Error(existingError.message);
  }
  if (!existing) {
    return;
  }

  if (!normalized.order.subscriptionId || existing.polar_subscription_id !== normalized.order.subscriptionId) {
    return;
  }

  if (
    isProviderUpdateStale(
      normalized.providerModifiedAt,
      existing.last_provider_modified_at,
    )
  ) {
    return;
  }

  const { error } = await supabase
    .from("billing_accounts")
    .update({
      provider_status:
        existing.provider_status === "revoked" ? "revoked" : "active",
      past_due_since: null,
      last_provider_modified_at: normalized.providerModifiedAt,
      updated_at: new Date().toISOString(),
    })
    .eq("account_id", normalized.accountId);

  if (error) {
    throw new Error(error.message);
  }
}

async function insertWebhookEvent(
  normalized: NormalizedPolarEvent,
  payload: Json,
  accountId: string | null,
  supabase: ReturnType<typeof createServiceRoleClient>,
) {
  return supabase
    .from("billing_webhook_events")
    .insert({
      provider_event_id: normalized.providerEventId,
      event_type: normalized.eventType,
      account_id: accountId,
      provider_modified_at: normalized.providerModifiedAt,
      payload,
      processing_status: "processing",
    })
    .select("provider_event_id")
    .maybeSingle();
}

async function claimWebhookEvent(
  normalized: NormalizedPolarEvent,
  payload: Json,
  supabase: ReturnType<typeof createServiceRoleClient>,
): Promise<boolean> {
  let { data: inserted, error: insertError } = await insertWebhookEvent(
    normalized,
    payload,
    normalized.accountId,
    supabase,
  );

  if (insertError?.code === "23503" || insertError?.code === "22P02") {
    ({ data: inserted, error: insertError } = await insertWebhookEvent(
      normalized,
      payload,
      null,
      supabase,
    ));
  }

  if (!insertError && inserted) {
    return true;
  }

  if (insertError?.code !== "23505") {
    throw new Error(insertError?.message ?? "Failed to record Polar webhook event");
  }

  const { data: existing, error: existingError } = await supabase
    .from("billing_webhook_events")
    .select("processing_status")
    .eq("provider_event_id", normalized.providerEventId)
    .single();

  if (existingError || !existing) {
    throw new Error(existingError?.message ?? "Failed to load Polar webhook event");
  }

  if (existing.processing_status === "processed") {
    return false;
  }

  const { error: reclaimError } = await supabase
    .from("billing_webhook_events")
    .update({
      event_type: normalized.eventType,
      account_id: normalized.accountId,
      provider_modified_at: normalized.providerModifiedAt,
      payload,
      processing_status: "processing",
      error_message: null,
      processed_at: null,
    })
    .eq("provider_event_id", normalized.providerEventId);

  if (reclaimError) {
    throw new Error(reclaimError.message);
  }
  return true;
}

export async function processPolarWebhook(
  event: unknown,
  providerEventId: string,
): Promise<{ duplicate: boolean; ignored: boolean }> {
  const config = getBillingConfig();
  if (!config.enabled) {
    throw new Error("Polar billing is not enabled");
  }

  const normalized = normalizePolarEvent(event, providerEventId, config);
  const payload = serializeEvent(event);
  const supabase = createServiceRoleClient();
  const claimed = await claimWebhookEvent(normalized, payload, supabase);

  if (!claimed) {
    return { duplicate: true, ignored: normalized.kind === "ignored" };
  }

  try {
    if (normalized.kind === "subscription") {
      await processSubscriptionEvent(normalized, supabase);
    } else if (normalized.kind === "order_paid") {
      await processPaidOrderEvent(normalized, supabase);
    }

    const { error } = await supabase
      .from("billing_webhook_events")
      .update({
        processing_status: "processed",
        error_message: null,
        processed_at: new Date().toISOString(),
      })
      .eq("provider_event_id", providerEventId);

    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Polar webhook error";
    await supabase
      .from("billing_webhook_events")
      .update({ processing_status: "failed", error_message: message })
      .eq("provider_event_id", providerEventId);
    throw error;
  }

  return { duplicate: false, ignored: normalized.kind === "ignored" };
}
