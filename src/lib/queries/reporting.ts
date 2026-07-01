import { createClient } from "@/lib/supabase/server";
import {
  requireAccountId,
  requireAdminAccountId,
  requireUserId,
} from "@/lib/supabase/account";
import { getAccountMemberProfiles } from "@/lib/queries/members";

export interface LeadsByStage {
  stageId: string;
  stageName: string;
  count: number;
}

export interface DashboardStats {
  totalLeads: number;
  leadsThisWeek: number;
  leadsByStage: LeadsByStage[];
}

function getStartOfWeekIso(): string {
  const now = new Date();
  const day = now.getUTCDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diffToMonday),
  );
  return monday.toISOString();
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const accountId = await requireAccountId();
  const supabase = await createClient();

  const { count: totalLeads, error: totalError } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("account_id", accountId)
    .is("deleted_at", null);

  if (totalError) {
    throw new Error(totalError.message);
  }

  const { count: leadsThisWeek, error: weekError } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("account_id", accountId)
    .is("deleted_at", null)
    .gte("created_at", getStartOfWeekIso());

  if (weekError) {
    throw new Error(weekError.message);
  }

  const { data: stages, error: stagesError } = await supabase
    .from("pipeline_stages")
    .select("id, name, display_order")
    .eq("account_id", accountId)
    .order("display_order");

  if (stagesError) {
    throw new Error(stagesError.message);
  }

  const { data: leadStageIds, error: leadsError } = await supabase
    .from("leads")
    .select("pipeline_stage_id")
    .eq("account_id", accountId)
    .is("deleted_at", null);

  if (leadsError) {
    throw new Error(leadsError.message);
  }

  const countsByStage = new Map<string, number>();
  for (const lead of leadStageIds ?? []) {
    countsByStage.set(
      lead.pipeline_stage_id,
      (countsByStage.get(lead.pipeline_stage_id) ?? 0) + 1,
    );
  }

  const leadsByStage: LeadsByStage[] = (stages ?? []).map((stage) => ({
    stageId: stage.id,
    stageName: stage.name,
    count: countsByStage.get(stage.id) ?? 0,
  }));

  return {
    totalLeads: totalLeads ?? 0,
    leadsThisWeek: leadsThisWeek ?? 0,
    leadsByStage,
  };
}

export interface UserScorecard {
  openLeadsOwned: number;
  leadsCreatedThisWeek: number;
  activitiesThisWeek: number;
  winRate: number | null;
  avgDaysToWon: number | null;
  sequenceStepsSentThisWeek: number;
}

async function computeScorecard(
  supabase: Awaited<ReturnType<typeof createClient>>,
  accountId: string,
  userId: string,
): Promise<UserScorecard> {
  const startOfWeek = getStartOfWeekIso();

  const { count: openLeadsOwned } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("account_id", accountId)
    .eq("owner_user_id", userId)
    .eq("status", "open")
    .is("deleted_at", null);

  const { count: leadsCreatedThisWeek } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("account_id", accountId)
    .eq("owner_user_id", userId)
    .is("deleted_at", null)
    .gte("created_at", startOfWeek);

  const { count: activitiesThisWeek } = await supabase
    .from("activities")
    .select("*", { count: "exact", head: true })
    .eq("account_id", accountId)
    .eq("actor_user_id", userId)
    .gte("created_at", startOfWeek);

  const { data: closedLeads } = await supabase
    .from("leads")
    .select("status, created_at, updated_at")
    .eq("account_id", accountId)
    .eq("owner_user_id", userId)
    .in("status", ["won", "lost"])
    .is("deleted_at", null);

  const wonLeads = (closedLeads ?? []).filter((lead) => lead.status === "won");
  const closedCount = closedLeads?.length ?? 0;
  const winRate = closedCount > 0 ? wonLeads.length / closedCount : null;

  const avgDaysToWon =
    wonLeads.length > 0
      ? wonLeads.reduce((sum, lead) => {
          const days =
            (new Date(lead.updated_at).getTime() -
              new Date(lead.created_at).getTime()) /
            (1000 * 60 * 60 * 24);
          return sum + days;
        }, 0) / wonLeads.length
      : null;

  const { count: sequenceStepsSentThisWeek } = await supabase
    .from("sequence_step_sends")
    .select("*", { count: "exact", head: true })
    .eq("account_id", accountId)
    .eq("sent_by_user_id", userId)
    .gte("sent_at", startOfWeek);

  return {
    openLeadsOwned: openLeadsOwned ?? 0,
    leadsCreatedThisWeek: leadsCreatedThisWeek ?? 0,
    activitiesThisWeek: activitiesThisWeek ?? 0,
    winRate,
    avgDaysToWon,
    sequenceStepsSentThisWeek: sequenceStepsSentThisWeek ?? 0,
  };
}

export async function getUserScorecard(userId?: string): Promise<UserScorecard> {
  const accountId = await requireAccountId();
  const targetUserId = userId ?? (await requireUserId());
  const supabase = await createClient();

  return computeScorecard(supabase, accountId, targetUserId);
}

export interface TeamScorecardEntry extends UserScorecard {
  userId: string;
  email: string;
  role: string;
}

export async function getTeamScorecard(): Promise<TeamScorecardEntry[]> {
  const accountId = await requireAdminAccountId();
  const supabase = await createClient();
  const members = await getAccountMemberProfiles();

  const entries = await Promise.all(
    members.map(async (member) => ({
      userId: member.userId,
      email: member.email,
      role: member.role,
      ...(await computeScorecard(supabase, accountId, member.userId)),
    })),
  );

  return entries.sort((a, b) => b.openLeadsOwned - a.openLeadsOwned);
}
