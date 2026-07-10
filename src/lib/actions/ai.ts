"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAccountId } from "@/lib/supabase/account";
import { parseCallNotes } from "@/lib/ai/parse-call-notes";
import type { ExtractedCallNoteFields } from "@/lib/ai/parse-call-notes";
import { scoreLead, type LeadScoreResult } from "@/lib/ai/score-lead";

export async function parseCallNotesAction(
  rawText: string,
): Promise<ExtractedCallNoteFields> {
  await requireAccountId();
  return parseCallNotes(rawText);
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export async function scoreLeadAction(
  leadId: string,
): Promise<LeadScoreResult> {
  await requireAccountId();
  const supabase = await createClient();

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("*, property:lead_properties(*)")
    .eq("id", leadId)
    .is("deleted_at", null)
    .single();

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
  const property = Array.isArray(lead.property)
    ? lead.property[0]
    : lead.property;
  const { account_id: _accountId, lead_id: _leadId, id: _id, ...propertyFields } =
    property ?? {};

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
    .eq("id", leadId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidatePath(`/leads/${leadId}`);
  return result;
}
