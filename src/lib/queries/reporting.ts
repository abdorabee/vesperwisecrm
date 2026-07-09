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

export interface LeadsBySource {
  source: string;
  count: number;
}

export interface DailyActivityCount {
  date: string;
  count: number;
}

export interface DashboardStats {
  totalLeads: number;
  leadsThisWeek: number;
  leadsByStage: LeadsByStage[];
  leadsBySource: LeadsBySource[];
  totalTouches: number;
  averageTouchesPerLead: number | null;
  closedLeads: number;
  wonLeads: number;
  closeRate: number | null;
  activitiesByDay: DailyActivityCount[];
}

export interface AtRiskLead {
  id: string;
  title: string;
  createdAt: string;
}

// "No lead left behind": every open lead should have an open task or an
// active sequence enrollment. Anything without either is silently leaking,
// the exact failure mode competitor CRMs don't surface.
export async function getAtRiskLeads(): Promise<AtRiskLead[]> {
  const accountId = await requireAccountId();
  const supabase = await createClient();

  const { data: openLeads, error: leadsError } = await supabase
    .from("leads")
    .select("id, title, created_at")
    .eq("account_id", accountId)
    .eq("status", "open")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (leadsError) {
    throw new Error(leadsError.message);
  }
  if (!openLeads || openLeads.length === 0) {
    return [];
  }

  const leadIds = openLeads.map((lead) => lead.id);

  const [{ data: openTasks, error: tasksError }, { data: activeEnrollments, error: enrollmentsError }] =
    await Promise.all([
      supabase
        .from("lead_tasks")
        .select("lead_id")
        .eq("account_id", accountId)
        .is("completed_at", null)
        .in("lead_id", leadIds),
      supabase
        .from("lead_sequence_enrollments")
        .select("lead_id")
        .eq("account_id", accountId)
        .eq("status", "active")
        .in("lead_id", leadIds),
    ]);

  if (tasksError) {
    throw new Error(tasksError.message);
  }
  if (enrollmentsError) {
    throw new Error(enrollmentsError.message);
  }

  const covered = new Set([
    ...(openTasks ?? []).map((task) => task.lead_id),
    ...(activeEnrollments ?? []).map((enrollment) => enrollment.lead_id),
  ]);

  return openLeads
    .filter((lead) => !covered.has(lead.id))
    .map((lead) => ({
      id: lead.id,
      title: lead.title,
      createdAt: lead.created_at,
    }));
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
    .select("pipeline_stage_id, status, contact:contact_id(source)")
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

  const sourceCounts = new Map<string, number>();
  let closedLeads = 0;
  let wonLeads = 0;

  for (const lead of leadStageIds ?? []) {
    const source =
      (
        lead.contact as {
          source: string | null;
        } | null
      )?.source?.trim() || "Unknown";

    sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1);

    if (lead.status === "won" || lead.status === "lost") {
      closedLeads += 1;
    }

    if (lead.status === "won") {
      wonLeads += 1;
    }
  }

  const leadsBySource: LeadsBySource[] = Array.from(sourceCounts.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source));

  const { data: activities, error: activitiesError } = await supabase
    .from("activities")
    .select("created_at")
    .eq("account_id", accountId)
    .not("lead_id", "is", null);

  if (activitiesError) {
    throw new Error(activitiesError.message);
  }

  const activityCountsByDate = new Map<string, number>();
  const startOfWeek = getStartOfWeekIso();
  for (const activity of activities ?? []) {
    if (activity.created_at < startOfWeek) {
      continue;
    }

    const date = new Date(activity.created_at).toISOString().slice(0, 10);
    activityCountsByDate.set(date, (activityCountsByDate.get(date) ?? 0) + 1);
  }

  const activitiesByDay: DailyActivityCount[] = Array.from(
    activityCountsByDate.entries(),
  )
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalTouches = activities?.length ?? 0;
  const effectiveTotalLeads = totalLeads ?? 0;

  return {
    totalLeads: effectiveTotalLeads,
    leadsThisWeek: leadsThisWeek ?? 0,
    leadsByStage,
    leadsBySource,
    totalTouches,
    averageTouchesPerLead:
      effectiveTotalLeads > 0 ? totalTouches / effectiveTotalLeads : null,
    closedLeads,
    wonLeads,
    closeRate: closedLeads > 0 ? wonLeads / closedLeads : null,
    activitiesByDay,
  };
}

export interface UserScorecard {
  openLeadsOwned: number;
  leadsCreatedThisWeek: number;
  activitiesThisWeek: number;
  winRate: number | null;
  avgDaysToWon: number | null;
  sequenceStepsSentThisWeek: number;
  leadsSubmitted: number;
  leadsQualified: number;
  leadsRejected: number;
  qualificationRate: number | null;
  avgHoursToQualify: number | null;
  topRejectionReasons: { reason: string; count: number }[];
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

  // Caller-side: of the leads this person submitted, how many were qualified
  // vs rejected, and why. Lead-manager-side: how fast they clear the queue.
  const { count: leadsSubmitted } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("account_id", accountId)
    .eq("submitted_by_user_id", userId);

  const { data: submittedOutcomes } = await supabase
    .from("leads")
    .select("qualification_status, rejection_reason")
    .eq("account_id", accountId)
    .eq("submitted_by_user_id", userId)
    .in("qualification_status", ["qualified", "rejected"]);

  const leadsQualified =
    submittedOutcomes?.filter((lead) => lead.qualification_status === "qualified")
      .length ?? 0;
  const rejectedSubmissions =
    submittedOutcomes?.filter((lead) => lead.qualification_status === "rejected") ??
    [];
  const leadsRejected = rejectedSubmissions.length;
  const qualificationRate =
    leadsQualified + leadsRejected > 0
      ? leadsQualified / (leadsQualified + leadsRejected)
      : null;

  const reasonCounts = new Map<string, number>();
  for (const lead of rejectedSubmissions) {
    const reason = lead.rejection_reason?.trim() || "No reason given";
    reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
  }
  const topRejectionReasons = Array.from(reasonCounts.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const { data: qualifiedByUser } = await supabase
    .from("leads")
    .select("created_at, qualified_at")
    .eq("account_id", accountId)
    .eq("qualified_by_user_id", userId)
    .not("qualified_at", "is", null);

  const avgHoursToQualify =
    qualifiedByUser && qualifiedByUser.length > 0
      ? qualifiedByUser.reduce((sum, lead) => {
          const hours =
            (new Date(lead.qualified_at!).getTime() -
              new Date(lead.created_at).getTime()) /
            (1000 * 60 * 60);
          return sum + hours;
        }, 0) / qualifiedByUser.length
      : null;

  return {
    openLeadsOwned: openLeadsOwned ?? 0,
    leadsCreatedThisWeek: leadsCreatedThisWeek ?? 0,
    activitiesThisWeek: activitiesThisWeek ?? 0,
    winRate,
    avgDaysToWon,
    sequenceStepsSentThisWeek: sequenceStepsSentThisWeek ?? 0,
    leadsSubmitted: leadsSubmitted ?? 0,
    leadsQualified,
    leadsRejected,
    qualificationRate,
    avgHoursToQualify,
    topRejectionReasons,
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
