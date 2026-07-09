import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { requireClientContext } from "@/lib/supabase/account";
import type { Tables } from "@/lib/supabase/types";

export interface PortalLead extends Tables<"leads"> {
  property: Tables<"lead_properties"> | null;
}

export async function getPortalLeads(): Promise<PortalLead[]> {
  const { accountId, clientId } = await requireClientContext();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leads")
    .select("*, property:lead_properties(*)")
    .eq("account_id", accountId)
    .eq("client_id", clientId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((lead) => {
    const { property, ...rest } = lead as unknown as Tables<"leads"> & {
      property: Tables<"lead_properties">[] | Tables<"lead_properties"> | null;
    };

    return {
      ...rest,
      property: Array.isArray(property) ? (property[0] ?? null) : property,
    };
  });
}

export async function getPortalLeadDetail(leadId: string): Promise<PortalLead> {
  const { accountId, clientId } = await requireClientContext();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leads")
    .select("*, property:lead_properties(*)")
    .eq("id", leadId)
    .eq("account_id", accountId)
    .eq("client_id", clientId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    notFound();
  }

  const { property, ...rest } = data as unknown as Tables<"leads"> & {
    property: Tables<"lead_properties">[] | Tables<"lead_properties"> | null;
  };

  return {
    ...rest,
    property: Array.isArray(property) ? (property[0] ?? null) : property,
  };
}

export async function getLeadClientComments(
  leadId: string,
): Promise<Tables<"lead_client_comments">[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("lead_client_comments")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}
