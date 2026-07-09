import { createClient } from "@/lib/supabase/server";
import { requireAccountId, requireAdminAccountId } from "@/lib/supabase/account";
import type { Tables } from "@/lib/supabase/types";

// Lighter-weight than getClients(): any team member can assign a lead to a
// client (an acquisitions task, not an admin one), so this is intentionally
// not admin-gated.
export async function getClientsForAssignment(): Promise<
  Pick<Tables<"clients">, "id" | "name">[]
> {
  const accountId = await requireAccountId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("clients")
    .select("id, name")
    .eq("account_id", accountId)
    .order("name");

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export interface ClientPortalMember {
  userId: string;
  email: string;
  clientId: string;
}

export async function getClients(): Promise<Tables<"clients">[]> {
  const accountId = await requireAdminAccountId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getClientDetail(
  clientId: string,
): Promise<Tables<"clients"> | null> {
  const accountId = await requireAdminAccountId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .eq("account_id", accountId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getClientLeads(
  clientId: string,
): Promise<Tables<"leads">[]> {
  const accountId = await requireAdminAccountId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("account_id", accountId)
    .eq("client_id", clientId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getClientPortalMembers(): Promise<
  Record<string, ClientPortalMember[]>
> {
  const accountId = await requireAdminAccountId();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_client_portal_members", {
    p_account_id: accountId,
  });

  if (error) {
    throw new Error(error.message);
  }

  const byClientId: Record<string, ClientPortalMember[]> = {};
  for (const row of data ?? []) {
    const entry: ClientPortalMember = {
      userId: row.user_id,
      email: row.email,
      clientId: row.client_id,
    };
    byClientId[row.client_id] = [...(byClientId[row.client_id] ?? []), entry];
  }

  return byClientId;
}
