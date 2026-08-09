import { createClient } from "@/lib/supabase/server";
import { requireAccountId, requireUserId } from "@/lib/supabase/account";
import type { Tables } from "@/lib/supabase/types";
import { isDialerEnabled } from "@/lib/dialer/config";
import { getDialerCredentialStatus, type DialerCredentialStatus } from "@/lib/queries/dialer-credentials";

export interface DialerQueueItem extends Tables<"dialer_queue_items"> {
  contact: Pick<Tables<"contacts">, "id" | "first_name" | "last_name" | "phone" | "do_not_call_at">;
  lead: Pick<Tables<"leads">, "id" | "title"> | null;
  attempts: Array<Pick<Tables<"call_attempts">, "id" | "status" | "attempt_number" | "created_at">>;
}

export interface DialerQueue extends Tables<"dialer_queues"> {
  items: DialerQueueItem[];
}

export interface DialerCallRecord extends Tables<"calls"> {
  contact: Pick<Tables<"contacts">, "id" | "first_name" | "last_name" | "phone">;
  lead: Pick<Tables<"leads">, "id" | "title"> | null;
  disposition: Pick<Tables<"call_dispositions">, "id" | "name" | "category"> | null;
  attempts: Array<Pick<Tables<"call_attempts">,
    "id" | "status" | "attempt_number" | "user_id" | "notes" | "failure_reason" |
    "initiated_at" | "ringing_at" | "answered_at" | "ended_at" | "disposition_id"
  >>;
}

export interface DialerPageData {
  enabled: boolean;
  isAdmin: boolean;
  userId: string;
  queues: DialerQueue[];
  history: DialerCallRecord[];
  dispositions: Tables<"call_dispositions">[];
  settings: Tables<"dialer_settings"> | null;
  candidateLeads: Array<{
    id: string;
    title: string;
    contact: Pick<Tables<"contacts">, "id" | "first_name" | "last_name" | "phone">;
  }>;
  groups: Array<Pick<Tables<"lead_groups">, "id" | "name">>;
  twilioCredentialStatus: DialerCredentialStatus;
}

export async function getDialerPageData(): Promise<DialerPageData> {
  const accountId = await requireAccountId();
  const userId = await requireUserId();
  const supabase = await createClient();

  if (!isDialerEnabled()) {
    const { data: member } = await supabase
      .from("account_members")
      .select("role")
      .eq("account_id", accountId)
      .eq("user_id", userId)
      .single();
    return {
      enabled: false,
      isAdmin: member?.role === "owner" || member?.role === "admin",
      userId,
      queues: [],
      history: [],
      dispositions: [],
      settings: null,
      candidateLeads: [],
      groups: [],
      twilioCredentialStatus: { connected: false, accountSid: null, fromNumber: null, status: null, lastVerifiedAt: null },
    };
  }

  const [memberResult, queueResult, historyResult, dispositionsResult, settingsResult, leadsResult, groupsResult, twilioCredentialStatus] =
    await Promise.all([
      supabase
        .from("account_members")
        .select("role")
        .eq("account_id", accountId)
        .eq("user_id", userId)
        .single(),
      supabase
        .from("dialer_queues")
        .select(
          "*, items:dialer_queue_items(*, contact:contact_id(id, first_name, last_name, phone, do_not_call_at), lead:lead_id(id, title))",
        )
        .eq("account_id", accountId)
        .order("created_at", { ascending: false })
        .order("position", { referencedTable: "dialer_queue_items", ascending: true }),
      supabase
        .from("calls")
        .select(
          "*, contact:contact_id(id, first_name, last_name, phone), lead:lead_id(id, title), disposition:latest_disposition_id(id, name, category), attempts:call_attempts(id, status, attempt_number, user_id, notes, failure_reason, initiated_at, ringing_at, answered_at, ended_at, disposition_id)",
        )
        .eq("account_id", accountId)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("call_dispositions")
        .select("*")
        .eq("account_id", accountId)
        .eq("is_active", true)
        .order("display_order"),
      supabase
        .from("dialer_settings")
        .select("*")
        .eq("account_id", accountId)
        .maybeSingle(),
      supabase
        .from("leads")
        .select("id, title, contact:contact_id(id, first_name, last_name, phone)")
        .eq("account_id", accountId)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(200),
      supabase
        .from("lead_groups")
        .select("id, name")
        .eq("account_id", accountId)
        .order("name"),
      getDialerCredentialStatus(),
    ]);

  for (const result of [queueResult, historyResult, dispositionsResult, settingsResult, leadsResult, groupsResult]) {
    if (result.error) throw new Error(result.error.message);
  }

  const rawQueues = (queueResult.data ?? []) as unknown as Array<
    Tables<"dialer_queues"> & {
      items: Array<Tables<"dialer_queue_items"> & {
        contact: DialerQueueItem["contact"];
        lead: DialerQueueItem["lead"];
      }>;
    }
  >;
  const queueItemIds = rawQueues.flatMap((queue) => queue.items.map((item) => item.id));
  const attemptsByQueueItem = new Map<string, DialerQueueItem["attempts"]>();
  if (queueItemIds.length > 0) {
    const { data: queueCalls, error } = await supabase
      .from("calls")
      .select("queue_item_id, attempts:call_attempts(id, status, attempt_number, created_at)")
      .in("queue_item_id", queueItemIds);
    if (error) throw new Error(error.message);
    for (const call of queueCalls ?? []) {
      if (!call.queue_item_id) continue;
      const current = attemptsByQueueItem.get(call.queue_item_id) ?? [];
      attemptsByQueueItem.set(call.queue_item_id, [
        ...current,
        ...((call.attempts ?? []) as DialerQueueItem["attempts"]),
      ]);
    }
  }

  return {
    enabled: true,
    isAdmin: memberResult.data?.role === "owner" || memberResult.data?.role === "admin",
    userId,
    queues: rawQueues.map((queue) => ({
      ...queue,
      items: queue.items.map((item) => ({
        ...item,
        attempts: attemptsByQueueItem.get(item.id) ?? [],
      })),
    })),
    history: (historyResult.data ?? []) as unknown as DialerCallRecord[],
    dispositions: dispositionsResult.data ?? [],
    settings: settingsResult.data,
    candidateLeads: (leadsResult.data ?? []).filter((lead) => lead.contact?.phone) as unknown as DialerPageData["candidateLeads"],
    groups: groupsResult.data ?? [],
    twilioCredentialStatus,
  };
}

export async function getActiveDialerCall(): Promise<DialerCallRecord | null> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("calls")
    .select(
      "*, contact:contact_id(id, first_name, last_name, phone), lead:lead_id(id, title), disposition:latest_disposition_id(id, name, category), attempts:call_attempts(id, status, attempt_number, user_id, notes, failure_reason, initiated_at, ringing_at, answered_at, ended_at, disposition_id)",
    )
    .eq("owner_user_id", userId)
    .in("status", ["queued", "initiating", "ringing", "answered"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as unknown as DialerCallRecord | null;
}

export async function getDialerShellData(): Promise<{
  active: DialerCallRecord | null;
  dispositions: Tables<"call_dispositions">[];
}> {
  const accountId = await requireAccountId();
  const supabase = await createClient();
  const [active, dispositions] = await Promise.all([
    getActiveDialerCall(),
    supabase
      .from("call_dispositions")
      .select("*")
      .eq("account_id", accountId)
      .eq("is_active", true)
      .order("display_order"),
  ]);
  if (dispositions.error) throw new Error(dispositions.error.message);
  return { active, dispositions: dispositions.data ?? [] };
}

export async function getLeadCallHistory(leadId: string): Promise<DialerCallRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("calls")
    .select(
      "*, contact:contact_id(id, first_name, last_name, phone), lead:lead_id(id, title), disposition:latest_disposition_id(id, name, category), attempts:call_attempts(id, status, attempt_number, user_id, notes, failure_reason, initiated_at, ringing_at, answered_at, ended_at, disposition_id)",
    )
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(25);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as DialerCallRecord[];
}
