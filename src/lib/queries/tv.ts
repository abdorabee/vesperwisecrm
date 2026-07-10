import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { requireAdminAccountId } from "@/lib/supabase/account";
import type { Tables } from "@/lib/supabase/types";

// TV KPI wall queries (INT-33). These run unauthenticated behind a display
// token, so everything here uses the service-role client scoped to the
// token's account — never cookie-bound helpers.

export interface TvCallerStat {
  name: string;
  count: number;
}

export interface TvKpis {
  accountName: string;
  submittedToday: number;
  submittedWeek: number;
  qualifiedWeek: number;
  qualificationRate: number | null;
  wonMonth: number;
  atRiskCount: number;
  topCallers: TvCallerStat[];
}

// Admin-facing listing goes through the user session client so the
// tv_display_tokens RLS policies apply.
export async function getTvDisplayTokensForAdmin(): Promise<
  Tables<"tv_display_tokens">[]
> {
  await requireAdminAccountId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tv_display_tokens")
    .select("*")
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export interface ResolvedTvToken {
  accountId: string;
  displayName: string;
}

export async function resolveTvDisplayToken(
  token: string,
): Promise<ResolvedTvToken | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("tv_display_tokens")
    .select("account_id, name, revoked_at")
    .eq("token", token)
    .maybeSingle();

  if (error || !data || data.revoked_at) {
    return null;
  }

  return { accountId: data.account_id, displayName: data.name };
}

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function startOfTodayIso(): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

export async function getTvKpis(accountId: string): Promise<TvKpis> {
  const supabase = createServiceRoleClient();
  const weekAgo = daysAgoIso(7);
  const monthAgo = daysAgoIso(30);

  const [
    account,
    submittedToday,
    submittedWeek,
    qualifiedWeek,
    wonStages,
    openLeads,
    weekLeads,
    memberRows,
  ] = await Promise.all([
    supabase.from("accounts").select("name").eq("id", accountId).single(),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("account_id", accountId)
      .is("deleted_at", null)
      .gte("created_at", startOfTodayIso()),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("account_id", accountId)
      .is("deleted_at", null)
      .gte("created_at", weekAgo),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("account_id", accountId)
      .is("deleted_at", null)
      .gte("qualified_at", weekAgo),
    supabase
      .from("pipeline_stages")
      .select("name")
      .eq("account_id", accountId)
      .eq("is_won", true),
    supabase
      .from("leads")
      .select("id")
      .eq("account_id", accountId)
      .eq("status", "open")
      .is("deleted_at", null),
    supabase
      .from("leads")
      .select("submitted_by_user_id")
      .eq("account_id", accountId)
      .is("deleted_at", null)
      .gte("created_at", weekAgo)
      .not("submitted_by_user_id", "is", null),
    // Not the get_account_member_profiles RPC: it guards on auth.uid(),
    // which is null for the service-role client this page runs under.
    supabase
      .from("account_members")
      .select("user_id, from_display_name")
      .eq("account_id", accountId),
  ]);

  const wonStageNames = (wonStages.data ?? []).map((stage) => stage.name);
  let wonMonth = 0;
  if (wonStageNames.length > 0) {
    const { count } = await supabase
      .from("activities")
      .select("id", { count: "exact", head: true })
      .eq("account_id", accountId)
      .eq("type", "stage_changed")
      .gte("created_at", monthAgo)
      .in("payload->>to_stage", wonStageNames);
    wonMonth = count ?? 0;
  }

  const openLeadIds = (openLeads.data ?? []).map((lead) => lead.id);
  let atRiskCount = 0;
  if (openLeadIds.length > 0) {
    const [tasks, enrollments] = await Promise.all([
      supabase
        .from("lead_tasks")
        .select("lead_id")
        .eq("account_id", accountId)
        .in("lead_id", openLeadIds)
        .is("completed_at", null),
      supabase
        .from("lead_sequence_enrollments")
        .select("lead_id")
        .eq("account_id", accountId)
        .in("lead_id", openLeadIds)
        .eq("status", "active"),
    ]);
    const covered = new Set([
      ...(tasks.data ?? []).map((row) => row.lead_id),
      ...(enrollments.data ?? []).map((row) => row.lead_id),
    ]);
    atRiskCount = openLeadIds.filter((id) => !covered.has(id)).length;
  }

  const nameByUserId = new Map<string, string | null>(
    (memberRows.data ?? []).map((member) => [
      member.user_id,
      member.from_display_name,
    ]),
  );
  const submissionCounts = new Map<string, number>();
  for (const lead of weekLeads.data ?? []) {
    const userId = lead.submitted_by_user_id;
    if (userId) {
      submissionCounts.set(userId, (submissionCounts.get(userId) ?? 0) + 1);
    }
  }
  const rankedCallers = [...submissionCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const topCallers = await Promise.all(
    rankedCallers.map(async ([userId, count]) => {
      const displayName = nameByUserId.get(userId);
      if (displayName) {
        return { name: displayName, count };
      }
      const { data } = await supabase.auth.admin.getUserById(userId);
      return { name: data.user?.email ?? "Team member", count };
    }),
  );

  const submitted = submittedWeek.count ?? 0;
  const qualified = qualifiedWeek.count ?? 0;

  return {
    accountName: account.data?.name ?? "Team",
    submittedToday: submittedToday.count ?? 0,
    submittedWeek: submitted,
    qualifiedWeek: qualified,
    qualificationRate:
      submitted > 0 ? Math.round((qualified / submitted) * 100) : null,
    wonMonth,
    atRiskCount,
    topCallers,
  };
}
