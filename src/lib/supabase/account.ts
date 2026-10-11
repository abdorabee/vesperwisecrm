import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const ACTIVE_ACCOUNT_COOKIE = "vw_active_account";

export interface SessionMembership {
  accountId: string;
  role: string;
  clientId: string | null;
  onboardingTourCompletedAt: string | null;
}

interface MembershipRow {
  account_id: string;
  role: string;
  client_id: string | null;
  created_at: string;
  onboarding_tour_completed_at: string | null;
}

function pickMembership(
  rows: MembershipRow[],
  requestedAccountId: string | undefined,
): MembershipRow | null {
  if (rows.length === 0) {
    return null;
  }
  if (requestedAccountId) {
    const match = rows.find((row) => row.account_id === requestedAccountId);
    if (match) return match;
  }
  return rows[0];
}

type SessionLookup =
  | { status: "anonymous" }
  | { status: "none" }
  | { status: "ok"; membership: SessionMembership };

async function lookupSessionMembership(): Promise<SessionLookup> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "anonymous" };
  }

  const { data, error } = await supabase
    .from("account_members")
    .select("account_id, role, client_id, created_at, onboarding_tour_completed_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .order("account_id", { ascending: true });

  if (error || !data?.length) {
    return { status: "none" };
  }

  const requested = (await cookies()).get(ACTIVE_ACCOUNT_COOKIE)?.value;
  const row = pickMembership(data, requested);
  if (!row) return { status: "none" };

  return {
    status: "ok",
    membership: {
      accountId: row.account_id,
      role: row.role,
      clientId: row.client_id,
      onboardingTourCompletedAt: row.onboarding_tour_completed_at,
    },
  };
}

export async function getSessionMembership(): Promise<SessionMembership | null> {
  const lookup = await lookupSessionMembership();
  return lookup.status === "ok" ? lookup.membership : null;
}

function requireKnownAccount(lookup: SessionLookup): SessionMembership {
  if (lookup.status === "anonymous") {
    throw new Error("Unauthorized");
  }
  if (lookup.status === "none") {
    throw new Error("No account found for the current user");
  }
  return lookup.membership;
}

export async function rememberActiveAccount(accountId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ACCOUNT_COOKIE, accountId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function requireAccountId(): Promise<string> {
  return requireKnownAccount(await lookupSessionMembership()).accountId;
}

export async function requireUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user.id;
}

export async function requireAdminAccountId(): Promise<string> {
  const membership = requireKnownAccount(await lookupSessionMembership());
  if (membership.role !== "owner" && membership.role !== "admin") {
    throw new Error("Admin access required");
  }
  return membership.accountId;
}

export interface ClientContext {
  accountId: string;
  clientId: string;
}

export async function requireClientContext(): Promise<ClientContext> {
  const membership = requireKnownAccount(await lookupSessionMembership());
  if (membership.role !== "client" || !membership.clientId) {
    throw new Error("Client portal access required");
  }
  return { accountId: membership.accountId, clientId: membership.clientId };
}
