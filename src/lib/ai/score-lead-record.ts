import type { SupabaseClient } from "@supabase/supabase-js";
import { scoreLead, type LeadScoreResult } from "@/lib/ai/score-lead";
import type { Database, Tables } from "@/lib/supabase/types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

type CRMClient = SupabaseClient<Database>;

type LeadScoreRow = Tables<"leads"> & {
  property: Tables<"lead_properties"> | Tables<"lead_properties">[] | null;
};

export async function scoreAndStoreLead(
  supabase: CRMClient,
  accountId: string,
  leadId: string,
): Promise<LeadScoreResult> {
  const { data, error: leadError } = await supabase
    .from("leads")
    .select("*, property:lead_properties(*)")
    .eq("id", leadId)
    .eq("account_id", accountId)
    .is("deleted_at", null)
    .single();

  const lead = data as LeadScoreRow | null;

  if (leadError || !lead) {
    throw new Error(leadError?.message ?? "Lead not found");
  }

  const { data: activities, error: activityError } = await supabase
    .from("activities")
    .select("type, created_at")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (activityError) {
    throw new Error(activityError.message);
  }

  const activityCounts: Record<string, number> = {};
  for (const activity of activities ?? []) {
    activityCounts[activity.type] = (activityCounts[activity.type] ?? 0) + 1;
  }

  const lastActivityAt = activities?.[0]?.created_at ?? null;
  const property = Array.isArray(lead.property) ? lead.property[0] : lead.property;
  const propertyFields = Object.fromEntries(
    Object.entries(property ?? {}).filter(
      ([key]) => !["account_id", "lead_id", "id"].includes(key),
    ),
  );

  const result = await scoreLead({
    title: lead.title,
    qualificationStatus: lead.qualification_status,
    value: lead.value == null ? null : Number(lead.value),
    property: propertyFields as Record<string, string | number | null>,
    activityCounts,
    daysSinceCreated: Math.floor(
      (Date.now() - new Date(lead.created_at).getTime()) / MS_PER_DAY,
    ),
    daysSinceLastActivity: lastActivityAt
      ? Math.floor((Date.now() - new Date(lastActivityAt).getTime()) / MS_PER_DAY)
      : null,
  });

  const { error: updateError } = await supabase
    .from("leads")
    .update({
      ai_score: result.score,
      ai_score_factors: {
        summary: result.summary,
        positives: result.positives,
        risks: result.risks,
      },
      ai_scored_at: new Date().toISOString(),
    })
    .eq("id", leadId)
    .eq("account_id", accountId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return result;
}
