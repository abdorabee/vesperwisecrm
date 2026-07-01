import { createClient } from "@/lib/supabase/server";
import { requireAccountId, requireUserId } from "@/lib/supabase/account";
import type { Tables } from "@/lib/supabase/types";

export interface LeadTask extends Tables<"lead_tasks"> {
  lead: Pick<Tables<"leads">, "id" | "title" | "status"> & {
    contact: Pick<Tables<"contacts">, "first_name" | "last_name" | "company"> | null;
  };
}

function mapTask(task: unknown): LeadTask {
  return task as LeadTask;
}

export async function getLeadTasks(leadId: string): Promise<LeadTask[]> {
  const accountId = await requireAccountId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("lead_tasks")
    .select(
      "*, lead:lead_id(id, title, status, contact:contact_id(first_name, last_name, company))",
    )
    .eq("account_id", accountId)
    .eq("lead_id", leadId)
    .order("completed_at", { ascending: true, nullsFirst: true })
    .order("due_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapTask);
}

export async function getYourDayTasks(): Promise<LeadTask[]> {
  const accountId = await requireAccountId();
  const userId = await requireUserId();
  const supabase = await createClient();

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from("lead_tasks")
    .select(
      "*, lead:lead_id(id, title, status, contact:contact_id(first_name, last_name, company))",
    )
    .eq("account_id", accountId)
    .eq("assigned_user_id", userId)
    .is("completed_at", null)
    .lte("due_at", endOfToday.toISOString())
    .order("due_at", { ascending: true })
    .order("priority", { ascending: false })
    .limit(12);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapTask);
}
