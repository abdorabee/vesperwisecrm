import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId } from "@/lib/supabase/account";
import type { Tables } from "@/lib/supabase/types";
import type { LeadMatchReason } from "@/lib/queries/pipeline";

export interface LeadDetail extends Tables<"leads"> {
  contact: Tables<"contacts">;
  stage: Tables<"pipeline_stages">;
  tags: Pick<Tables<"tags">, "id" | "name" | "color">[];
  property: Tables<"lead_properties"> | null;
}

export interface RelatedLead extends Tables<"leads"> {
  contact: Pick<
    Tables<"contacts">,
    "id" | "first_name" | "last_name" | "email" | "company"
  > | null;
  stage: Pick<Tables<"pipeline_stages">, "id" | "name"> | null;
  tags: Pick<Tables<"tags">, "id" | "name" | "color">[];
  relevance: number;
  matchReasons: LeadMatchReason[];
}

export async function getLeadDetail(leadId: string): Promise<LeadDetail> {
  await requireAccountId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leads")
    .select(
      "*, contact:contact_id(*), stage:pipeline_stage_id(*), property:lead_properties(*), tags:lead_tags(tag:tag_id(id, name, color))",
    )
    .eq("id", leadId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    notFound();
  }

  const { tags: leadTags, ...rest } = data as unknown as Tables<"leads"> & {
    contact: Tables<"contacts">;
    stage: Tables<"pipeline_stages">;
    property: Tables<"lead_properties">[] | Tables<"lead_properties"> | null;
    tags: { tag: Pick<Tables<"tags">, "id" | "name" | "color"> | null }[];
  };

  return {
    ...rest,
    property: Array.isArray(rest.property)
      ? (rest.property[0] ?? null)
      : rest.property,
    tags: leadTags.map((lt) => lt.tag).filter((tag) => tag !== null),
  };
}

export async function getLeadActivities(
  leadId: string,
): Promise<Tables<"activities">[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getRelatedLeads(leadId: string): Promise<RelatedLead[]> {
  const accountId = await requireAccountId();
  const supabase = await createClient();

  const { data: rawRelated, error: relatedError } = await supabase.rpc(
    "get_related_leads",
    {
      p_account_id: accountId,
      p_lead_id: leadId,
      p_limit: 6,
    },
  );

  if (relatedError) {
    throw new Error(relatedError.message);
  }

  const relatedMeta = (rawRelated ?? []).map((result) => ({
    leadId: result.lead_id,
    relevance: result.relevance,
    matchReasons: result.match_reasons as LeadMatchReason[],
  }));

  if (relatedMeta.length === 0) {
    return [];
  }

  const rankByLeadId = new Map(
    relatedMeta.map((result, index) => [result.leadId, index]),
  );
  const metaByLeadId = new Map(
    relatedMeta.map((result) => [result.leadId, result]),
  );

  const { data: rawLeads, error: leadsError } = await supabase
    .from("leads")
    .select(
      "*, contact:contact_id(id, first_name, last_name, email, company), stage:pipeline_stage_id(id, name), tags:lead_tags(tag:tag_id(id, name, color))",
    )
    .eq("account_id", accountId)
    .is("deleted_at", null)
    .in(
      "id",
      relatedMeta.map((result) => result.leadId),
    );

  if (leadsError) {
    throw new Error(leadsError.message);
  }

  return (rawLeads ?? [])
    .map((lead) => {
      const { tags: leadTags, ...rest } =
        lead as unknown as Tables<"leads"> & {
          contact: RelatedLead["contact"];
          stage: RelatedLead["stage"];
          tags: { tag: Pick<Tables<"tags">, "id" | "name" | "color"> | null }[];
        };
      const meta = metaByLeadId.get(rest.id);

      return {
        ...rest,
        contact: rest.contact,
        stage: rest.stage,
        tags: leadTags.map((lt) => lt.tag).filter((tag) => tag !== null),
        relevance: meta?.relevance ?? 0,
        matchReasons: meta?.matchReasons ?? [],
      };
    })
    .sort(
      (a, b) =>
        (rankByLeadId.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
        (rankByLeadId.get(b.id) ?? Number.MAX_SAFE_INTEGER),
    );
}
