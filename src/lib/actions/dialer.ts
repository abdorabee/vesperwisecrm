"use server";

import { revalidatePath } from "next/cache";
import { getDialerProvider } from "@/lib/dialer/providers/registry";
import { requireDialerEnabled } from "@/lib/dialer/config";
import { normalizeDialerPhone } from "@/lib/dialer/phone";
import type { PreparedDialerCall } from "@/lib/dialer/types";
import { createClient } from "@/lib/supabase/server";
import {
  requireAccountId,
  requireAdminAccountId,
  requireUserId,
} from "@/lib/supabase/account";
import {
  cancelCallSchema,
  clearDoNotCallSchema,
  dialerQueueSchema,
  dialerQueueStatusSchema,
  dialerSettingsSchema,
  dispositionCallSchema,
  dispositionSchema,
  queueItemSchema,
  startDialerCallSchema,
} from "@/lib/validations/dialer";

function refreshDialerPaths(leadId?: string | null): void {
  revalidatePath("/dialer");
  revalidatePath("/settings/calling");
  if (leadId) revalidatePath(`/leads/${leadId}`);
}

export async function startDialerCall(
  input: unknown,
): Promise<PreparedDialerCall> {
  const data = startDialerCallSchema.parse(input);
  const config = requireDialerEnabled();
  const accountId = await requireAccountId();
  const userId = await requireUserId();
  const supabase = await createClient();

  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .select("id, account_id, first_name, last_name, phone, deleted_at")
    .eq("id", data.contactId)
    .eq("account_id", accountId)
    .is("deleted_at", null)
    .maybeSingle();

  if (contactError || !contact) {
    throw new Error(contactError?.message ?? "Contact not found");
  }
  if (!contact.phone) throw new Error("This contact has no phone number");

  const toPhoneE164 = normalizeDialerPhone(contact.phone, config.defaultCountry);
  const provider = getDialerProvider();
  const { data: preparedRows, error: prepareError } = await supabase.rpc(
    "prepare_dialer_call",
    {
      p_contact_id: contact.id,
      p_lead_id: data.leadId ?? null,
      p_queue_item_id: data.queueItemId ?? null,
      p_phone_e164: toPhoneE164,
      p_idempotency_key: data.idempotencyKey,
      p_provider: provider.id,
      p_max_calls_per_second: config.maxCallsPerSecond,
    },
  );
  const prepared = preparedRows?.[0];
  if (prepareError || !prepared) {
    throw new Error(prepareError?.message ?? "Could not reserve this call");
  }

  try {
    const initiation = await provider.initiateCall({
      accountId,
      userId,
      attemptId: prepared.attempt_id,
    });
    refreshDialerPaths(data.leadId);
    return {
      callId: prepared.call_id,
      attemptId: prepared.attempt_id,
      status: "initiating",
      initiation,
      contact: {
        id: contact.id,
        name: [contact.first_name, contact.last_name].filter(Boolean).join(" "),
      },
      leadId: data.leadId ?? null,
    };
  } catch (error) {
    await supabase.rpc("finalize_dialer_attempt", {
      p_attempt_id: prepared.attempt_id,
      p_status: "failed",
      p_failure_code: "provider_initialization_failed",
      p_failure_reason: "The voice provider could not initialize the browser call",
    });
    refreshDialerPaths(data.leadId);
    throw error;
  }
}

export async function cancelDialerCall(input: unknown): Promise<void> {
  const data = cancelCallSchema.parse(input);
  requireDialerEnabled();
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data: attempt, error } = await supabase
    .from("call_attempts")
    .select("id, account_id, user_id, provider_parent_call_id, provider_call_id, call:calls(lead_id)")
    .eq("id", data.attemptId)
    .maybeSingle();
  if (error || !attempt) throw new Error(error?.message ?? "Call attempt not found");

  if (attempt.user_id !== userId) {
    const accountId = await requireAdminAccountId();
    const { data: sameAccount } = await supabase
      .from("call_attempts")
      .select("id")
      .eq("id", data.attemptId)
      .eq("account_id", accountId)
      .maybeSingle();
    if (!sameAccount) throw new Error("Not authorized to end this call");
  }

  const providerIds = [attempt.provider_call_id, attempt.provider_parent_call_id]
    .filter((value): value is string => Boolean(value));
  if (providerIds.length > 0) {
    await getDialerProvider().cancelCall(attempt.account_id, providerIds);
  }
  const { error: finalizeError } = await supabase.rpc("finalize_dialer_attempt", {
    p_attempt_id: data.attemptId,
    p_status: "cancelled",
    p_failure_code: "",
    p_failure_reason: "",
  });
  if (finalizeError) throw new Error(finalizeError.message);
  const linkedCall = Array.isArray(attempt.call) ? attempt.call[0] : attempt.call;
  refreshDialerPaths(linkedCall?.lead_id);
}

export async function reportDialerClientFailure(attemptId: string): Promise<void> {
  const id = cancelCallSchema.shape.attemptId.parse(attemptId);
  const supabase = await createClient();
  const { error } = await supabase.rpc("finalize_dialer_attempt", {
    p_attempt_id: id,
    p_status: "failed",
    p_failure_code: "browser_voice_failed",
    p_failure_reason: "The browser could not establish the voice connection",
  });
  if (error) throw new Error(error.message);
  refreshDialerPaths();
}

export async function saveDialerNotes(attemptId: string, notes: string): Promise<void> {
  const parsed = dispositionCallSchema.pick({ attemptId: true, notes: true }).parse({
    attemptId,
    notes,
  });
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_dialer_attempt_notes", {
    p_attempt_id: parsed.attemptId,
    p_notes: parsed.notes,
  });
  if (error) throw new Error(error.message);
  refreshDialerPaths();
}

export async function setDialerDisposition(input: unknown): Promise<void> {
  const data = dispositionCallSchema.parse(input);
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_dialer_disposition", {
    p_attempt_id: data.attemptId,
    p_disposition_id: data.dispositionId,
    p_notes: data.notes,
  });
  if (error) throw new Error(error.message);
  refreshDialerPaths();
}

export async function saveDialerQueue(input: unknown): Promise<{ queueId: string }> {
  const data = dialerQueueSchema.parse(input);
  const accountId = await requireAccountId();
  const userId = await requireUserId();
  const supabase = await createClient();
  let ownerUserId = data.ownerUserId;
  if (ownerUserId === null || ownerUserId !== userId || data.leadGroupId !== null) {
    await requireAdminAccountId();
  } else {
    ownerUserId = userId;
  }
  const values = {
    account_id: accountId,
    name: data.name,
    owner_user_id: ownerUserId,
    lead_group_id: data.leadGroupId,
    max_active_calls: data.maxActiveCalls,
    max_attempts: data.maxAttempts,
    retry_delay_seconds: data.retryDelaySeconds,
    updated_at: new Date().toISOString(),
  };
  if (data.id) {
    const { error } = await supabase.from("dialer_queues").update(values).eq("id", data.id);
    if (error) throw new Error(error.message);
    refreshDialerPaths();
    return { queueId: data.id };
  }
  const { data: queue, error } = await supabase
    .from("dialer_queues")
    .insert({ ...values, created_by_user_id: userId })
    .select("id")
    .single();
  if (error || !queue) throw new Error(error?.message ?? "Could not create queue");
  refreshDialerPaths();
  return { queueId: queue.id };
}

export async function setDialerQueueStatus(
  queueId: string,
  status: "active" | "paused" | "completed",
): Promise<void> {
  const data = dialerQueueStatusSchema.parse({ queueId, status });
  const supabase = await createClient();
  const { error } = await supabase
    .from("dialer_queues")
    .update({ status: data.status, updated_at: new Date().toISOString() })
    .eq("id", data.queueId);
  if (error) throw new Error(error.message);
  refreshDialerPaths();
}

export async function addDialerQueueItem(input: unknown): Promise<void> {
  const data = queueItemSchema.parse(input);
  const accountId = await requireAccountId();
  const supabase = await createClient();
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id, contact_id")
    .eq("id", data.leadId)
    .eq("account_id", accountId)
    .is("deleted_at", null)
    .maybeSingle();
  if (leadError || !lead) throw new Error(leadError?.message ?? "Lead not found");
  const { data: last } = await supabase
    .from("dialer_queue_items")
    .select("position")
    .eq("queue_id", data.queueId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from("dialer_queue_items").insert({
    account_id: accountId,
    queue_id: data.queueId,
    contact_id: lead.contact_id,
    lead_id: lead.id,
    position: (last?.position ?? 0) + 10,
  });
  if (error) throw new Error(error.message);
  refreshDialerPaths(data.leadId);
}

export async function cancelDialerQueueItem(itemId: string): Promise<void> {
  const id = startDialerCallSchema.shape.contactId.parse(itemId);
  const userId = await requireUserId();
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("dialer_queue_items")
    .update({
      status: "cancelled",
      cancelled_at: now,
      cancelled_by_user_id: userId,
      updated_at: now,
    })
    .eq("id", id)
    .eq("status", "queued");
  if (error) throw new Error(error.message);
  refreshDialerPaths();
}

export async function updateDialerSettings(input: unknown): Promise<void> {
  const data = dialerSettingsSchema.parse(input);
  const accountId = await requireAdminAccountId();
  const supabase = await createClient();
  const { error } = await supabase.from("dialer_settings").update({
    max_active_calls: data.maxActiveCalls,
    max_calls_per_second: data.maxCallsPerSecond,
    default_max_attempts: data.defaultMaxAttempts,
    default_retry_delay_seconds: data.defaultRetryDelaySeconds,
    updated_at: new Date().toISOString(),
  }).eq("account_id", accountId);
  if (error) throw new Error(error.message);
  refreshDialerPaths();
}

export async function saveCallDisposition(input: unknown): Promise<{ id: string }> {
  const data = dispositionSchema.parse(input);
  const accountId = await requireAdminAccountId();
  if (data.marksDoNotCall && data.category !== "do_not_call") {
    throw new Error("A Do Not Call disposition must use the Do Not Call category");
  }
  const supabase = await createClient();
  const values = {
    account_id: accountId,
    name: data.name,
    category: data.category,
    display_order: data.displayOrder,
    is_active: data.isActive,
    is_retryable: data.isRetryable,
    marks_do_not_call: data.marksDoNotCall,
    updated_at: new Date().toISOString(),
  };
  if (data.id) {
    const { error } = await supabase.from("call_dispositions").update(values).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { id: data.id };
  }
  const { data: row, error } = await supabase
    .from("call_dispositions")
    .insert(values)
    .select("id")
    .single();
  if (error || !row) throw new Error(error?.message ?? "Could not create disposition");
  return { id: row.id };
}

export async function clearContactDoNotCall(input: unknown): Promise<void> {
  const data = clearDoNotCallSchema.parse(input);
  await requireAdminAccountId();
  const supabase = await createClient();
  const { error } = await supabase.rpc("clear_contact_do_not_call", {
    p_contact_id: data.contactId,
    p_reason: data.reason,
  });
  if (error) throw new Error(error.message);
  refreshDialerPaths();
}
