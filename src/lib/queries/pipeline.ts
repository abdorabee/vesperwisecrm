import { createClient } from "@/lib/supabase/server";
import { requireAccountId } from "@/lib/supabase/account";
import { getAccountMemberProfiles } from "@/lib/queries/members";
import type { Tables } from "@/lib/supabase/types";

export interface LeadWithContact extends Tables<"leads"> {
  contact: Pick<
    Tables<"contacts">,
    "id" | "first_name" | "last_name" | "email" | "company"
  > | null;
  tags: Pick<Tables<"tags">, "id" | "name" | "color">[];
  ownerEmail: string | null;
  searchRelevance: number | null;
  matchReasons: LeadMatchReason[];
}

export interface PipelineData {
  accountId: string;
  stages: Tables<"pipeline_stages">[];
  leads: LeadWithContact[];
  tags: Tables<"tags">[];
}

export type LeadMatchReason =
  | "Exact email"
  | "Exact phone"
  | "Similar phone"
  | "Company match"
  | "Name match"
  | "Lead title match"
  | "Tag match"
  | "Notes match"
  | "Source match"
  | "Fuzzy match"
  | "All active leads"
  | "Same contact"
  | "Same email"
  | "Same phone"
  | "Same company"
  | "Similar name"
  | "Similar company"
  | "Shared tags";

export interface SmartLeadSearchResult {
  leadId: string;
  relevance: number;
  matchReasons: LeadMatchReason[];
}

export async function getStages(): Promise<Tables<"pipeline_stages">[]> {
  const accountId = await requireAccountId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pipeline_stages")
    .select("*")
    .eq("account_id", accountId)
    .order("display_order");

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getTags(): Promise<Tables<"tags">[]> {
  const accountId = await requireAccountId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .eq("account_id", accountId)
    .order("name");

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getPipelineData(filters: {
  stageId?: string;
  tagId?: string;
  ownerId?: string;
  query?: string;
}): Promise<PipelineData> {
  const accountId = await requireAccountId();
  const supabase = await createClient();
  const smartQuery = filters.query?.trim() ?? "";

  const { data: stages, error: stagesError } = await supabase
    .from("pipeline_stages")
    .select("*")
    .eq("account_id", accountId)
    .order("display_order");

  if (stagesError) {
    throw new Error(stagesError.message);
  }

  const { data: tags, error: tagsError } = await supabase
    .from("tags")
    .select("*")
    .eq("account_id", accountId)
    .order("name");

  if (tagsError) {
    throw new Error(tagsError.message);
  }

  let smartResults: SmartLeadSearchResult[] = [];
  let smartResultByLeadId = new Map<string, SmartLeadSearchResult>();
  let smartRankByLeadId = new Map<string, number>();

  if (smartQuery) {
    const { data: rawSmartResults, error: smartSearchError } =
      await supabase.rpc("smart_search_leads", {
        p_account_id: accountId,
        p_query: smartQuery,
        p_stage_id: filters.stageId ?? undefined,
        p_tag_id: filters.tagId ?? undefined,
        p_owner_id:
          filters.ownerId && filters.ownerId !== "unassigned"
            ? filters.ownerId
            : undefined,
        p_owner_unassigned: filters.ownerId === "unassigned",
        p_limit: 100,
      });

    if (smartSearchError) {
      throw new Error(smartSearchError.message);
    }

    smartResults = (rawSmartResults ?? []).map((result) => ({
      leadId: result.lead_id,
      relevance: result.relevance,
      matchReasons: result.match_reasons as LeadMatchReason[],
    }));
    smartResultByLeadId = new Map(
      smartResults.map((result) => [result.leadId, result]),
    );
    smartRankByLeadId = new Map(
      smartResults.map((result, index) => [result.leadId, index]),
    );
  }

  let leadsQuery = supabase
    .from("leads")
    .select(
      "*, contact:contact_id(id, first_name, last_name, email, company), tags:lead_tags(tag:tag_id(id, name, color))",
    )
    .eq("account_id", accountId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (smartQuery) {
    const leadIds = smartResults.map((result) => result.leadId);

    if (leadIds.length === 0) {
      return { accountId, stages: stages ?? [], leads: [], tags: tags ?? [] };
    }

    leadsQuery = leadsQuery.in("id", leadIds);
  } else if (filters.stageId) {
    leadsQuery = leadsQuery.eq("pipeline_stage_id", filters.stageId);
  }

  if (!smartQuery && filters.ownerId) {
    leadsQuery =
      filters.ownerId === "unassigned"
        ? leadsQuery.is("owner_user_id", null)
        : leadsQuery.eq("owner_user_id", filters.ownerId);
  }

  const { data: rawLeads, error: leadsError } = await leadsQuery;

  if (leadsError) {
    throw new Error(leadsError.message);
  }

  const memberProfiles = await getAccountMemberProfiles();
  const emailByUserId = new Map(memberProfiles.map((p) => [p.userId, p.email]));

  let leads: LeadWithContact[] = (rawLeads ?? []).map((lead) => {
    const { tags: leadTags, ...rest } = lead as unknown as Tables<"leads"> & {
      contact: LeadWithContact["contact"];
      tags: { tag: Pick<Tables<"tags">, "id" | "name" | "color"> | null }[];
    };

    return {
      ...rest,
      tags: leadTags.map((lt) => lt.tag).filter((tag) => tag !== null),
      ownerEmail: rest.owner_user_id
        ? (emailByUserId.get(rest.owner_user_id) ?? null)
        : null,
      searchRelevance: smartResultByLeadId.get(rest.id)?.relevance ?? null,
      matchReasons: smartResultByLeadId.get(rest.id)?.matchReasons ?? [],
    };
  });

  if (smartQuery) {
    leads = leads.sort(
      (a, b) =>
        (smartRankByLeadId.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
        (smartRankByLeadId.get(b.id) ?? Number.MAX_SAFE_INTEGER),
    );
  } else if (filters.tagId) {
    leads = leads.filter((lead) =>
      lead.tags.some((tag) => tag.id === filters.tagId),
    );
  }

  return { accountId, stages: stages ?? [], leads, tags: tags ?? [] };
}
