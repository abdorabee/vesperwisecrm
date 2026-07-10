// Onboarding tour persistence: verifies the new per-member completion flag,
// the server action that marks the caller's own row complete, and the RLS
// boundary that prevents a member from updating someone else's flag.
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import type { Database } from "../src/lib/supabase/types";
import { completeOnboardingTour } from "../src/lib/actions/onboarding-tour";

const cookieJar = vi.hoisted(() => ({
  values: new Map<string, string>(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    getAll: () =>
      Array.from(cookieJar.values.entries()).map(([name, value]) => ({
        name,
        value,
      })),
    set: (name: string, value: string) => {
      cookieJar.values.set(name, value);
    },
  }),
}));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PASSWORD = `Aa1!${randomBytes(18).toString("base64url")}`;
const RUN_ID = Date.now();

const admin = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY);

async function createConfirmedUser(
  label: string,
  userMetadata?: Record<string, string>,
): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: `onboarding-tour-${label}-${RUN_ID}@vesperwisecrm.test`,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: userMetadata,
  });
  if (error || !data.user) {
    throw new Error(`Failed to create ${label}: ${error?.message}`);
  }
  return data.user.id;
}

async function signInAs(userId: string): Promise<SupabaseClient<Database>> {
  const { data: userData } = await admin.auth.admin.getUserById(userId);
  const email = userData.user!.email!;
  const client = createClient<Database>(SUPABASE_URL, ANON_KEY);
  const { error } = await client.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (error) {
    throw new Error(`Failed to sign in ${email}: ${error.message}`);
  }
  return client;
}

async function useServerActionSession(
  client: SupabaseClient<Database>,
): Promise<void> {
  const {
    data: { session },
    error,
  } = await client.auth.getSession();

  if (error || !session) {
    throw new Error(error?.message ?? "No session available");
  }

  cookieJar.values.clear();

  const serverClient = createServerClient<Database>(SUPABASE_URL, ANON_KEY, {
    cookies: {
      getAll() {
        return Array.from(cookieJar.values.entries()).map(([name, value]) => ({
          name,
          value,
        }));
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          cookieJar.values.set(name, value);
        }
      },
    },
  });

  const { error: setSessionError } = await serverClient.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });

  if (setSessionError) {
    throw new Error(setSessionError.message);
  }
}

let ownerUserId: string;
let memberUserId: string;
let accountId: string;
let memberSupabase: SupabaseClient<Database>;

beforeAll(async () => {
  ownerUserId = await createConfirmedUser("owner");

  const { data: member } = await admin
    .from("account_members")
    .select("account_id")
    .eq("user_id", ownerUserId)
    .single();
  accountId = member!.account_id;

  memberUserId = await createConfirmedUser("member", {
    invited_account_id: accountId,
    invited_role: "member",
  });

  memberSupabase = await signInAs(memberUserId);
});

afterAll(async () => {
  if (accountId) {
    await admin.from("accounts").delete().eq("id", accountId);
  }

  for (const id of [ownerUserId, memberUserId]) {
    if (id) {
      await admin.auth.admin.deleteUser(id);
    }
  }
});

describe("onboarding tour completion", () => {
  test("new account_members rows start with a null completion timestamp", async () => {
    const { data, error } = await admin
      .from("account_members")
      .select("user_id, onboarding_tour_completed_at")
      .eq("account_id", accountId)
      .in("user_id", [ownerUserId, memberUserId]);

    expect(error).toBeNull();

    const completionByUserId = new Map(
      (data ?? []).map((row) => [
        row.user_id,
        row.onboarding_tour_completed_at,
      ]),
    );
    expect(completionByUserId.get(ownerUserId)).toBeNull();
    expect(completionByUserId.get(memberUserId)).toBeNull();
  });

  test("completeOnboardingTour sets the caller's own completion timestamp", async () => {
    await useServerActionSession(memberSupabase);
    await completeOnboardingTour();

    const { data } = await admin
      .from("account_members")
      .select("onboarding_tour_completed_at")
      .eq("account_id", accountId)
      .eq("user_id", memberUserId)
      .single();

    expect(data?.onboarding_tour_completed_at).not.toBeNull();
  });

  test("a member cannot update another user's completion timestamp", async () => {
    const attemptedTimestamp = new Date().toISOString();
    const { data, error } = await memberSupabase
      .from("account_members")
      .update({ onboarding_tour_completed_at: attemptedTimestamp })
      .eq("account_id", accountId)
      .eq("user_id", ownerUserId)
      .select("onboarding_tour_completed_at");

    expect(error).toBeNull();
    expect(data ?? []).toEqual([]);

    const { data: ownerMembership } = await admin
      .from("account_members")
      .select("onboarding_tour_completed_at")
      .eq("account_id", accountId)
      .eq("user_id", ownerUserId)
      .single();

    expect(ownerMembership?.onboarding_tour_completed_at).toBeNull();
  });
});
