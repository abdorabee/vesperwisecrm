"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAccountId } from "@/lib/supabase/account";
import type { LeadMatchReason } from "@/lib/queries/pipeline";

export interface CommandPaletteResult {
  leadId: string;
  title: string;
  contactName: string;
  matchReasons: LeadMatchReason[];
}

const RESULT_LIMIT = 8;

export async function searchCommandPalette(
  query: string,
): Promise<CommandPaletteResult[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const accountId = await requireAccountId();
  const supabase = await createClient();

  const { data: rawResults, error: searchError } = await supabase.rpc(
    "smart_search_leads",
    {
      p_account_id: accountId,
      p_query: trimmed,
      p_limit: RESULT_LIMIT,
    },
  );

  if (searchError) {
    throw new Error(searchError.message);
  }

  const leadIds = (rawResults ?? []).map((result) => result.lead_id);
  if (leadIds.length === 0) {
    return [];
  }

  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select("id, title, contact:contact_id(first_name, last_name)")
    .in("id", leadIds)
    .is("deleted_at", null);

  if (leadsError) {
    throw new Error(leadsError.message);
  }

  const leadById = new Map((leads ?? []).map((lead) => [lead.id, lead]));

  return (rawResults ?? [])
    .map((result): CommandPaletteResult | null => {
      const lead = leadById.get(result.lead_id);
      if (!lead) {
        return null;
      }

      const contact = Array.isArray(lead.contact)
        ? lead.contact[0]
        : lead.contact;
      const contactName = [contact?.first_name, contact?.last_name]
        .filter(Boolean)
        .join(" ");

      return {
        leadId: result.lead_id,
        title: lead.title,
        contactName,
        matchReasons: (result.match_reasons ?? []) as LeadMatchReason[],
      };
    })
    .filter((result): result is CommandPaletteResult => result !== null);
}
