// Integration coverage for the command palette's search action
// (src/lib/actions/search.ts). Runs against the live Supabase project
// using a real throwaway session, cleaned up in afterAll. Deliberately
// does not touch or re-test smart_search_leads itself (that RPC has its
// own coverage via the pipeline query path) -- this only verifies the
// action's own contract: account scoping, empty-query short-circuit, and
// that it correctly joins lead/contact display fields onto the RPC's
// relevance-ranked lead ids.
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import type { Database } from "../src/lib/supabase/types";
import { searchCommandPalette } from "../src/lib/actions/search";

const cookieJar = vi.hoisted(() => ({
  values: new Map<string, string>(),
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

async function createConfirmedUser(label: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: `cmdk-${label}-${RUN_ID}@vesperwisecrm.test`,
    password: PASSWORD,
    email_confirm: true,
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
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
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
let accountId: string;
let stageId: string;
let leadId: string;
let ownerSupabase: SupabaseClient<Database>;

beforeAll(async () => {
  ownerUserId = await createConfirmedUser("owner");

  const { data: member } = await admin
    .from("account_members")
    .select("account_id")
    .eq("user_id", ownerUserId)
    .single();
  accountId = member!.account_id;

  const { data: stage } = await admin
    .from("pipeline_stages")
    .select("id")
    .eq("account_id", accountId)
    .order("display_order")
    .limit(1)
    .single();
  stageId = stage!.id;

  const uniqueName = `Cmdk Palette Target ${RUN_ID}`;
  const { data: contact } = await admin
    .from("contacts")
    .insert({ account_id: accountId, first_name: uniqueName })
    .select("id")
    .single();

  const { data: lead } = await admin
    .from("leads")
    .insert({
      account_id: accountId,
      contact_id: contact!.id,
      pipeline_stage_id: stageId,
      title: `Palette test lead ${RUN_ID}`,
    })
    .select("id")
    .single();
  leadId = lead!.id;

  ownerSupabase = await signInAs(ownerUserId);
});

afterAll(async () => {
  if (accountId) {
    await admin.from("leads").delete().eq("account_id", accountId);
    await admin.from("contacts").delete().eq("account_id", accountId);
    await admin.from("accounts").delete().eq("id", accountId);
  }
  if (ownerUserId) {
    await admin.auth.admin.deleteUser(ownerUserId);
  }
});

describe("searchCommandPalette", () => {
  test("returns an empty array for a blank query without hitting the database", async () => {
    await useServerActionSession(ownerSupabase);
    const results = await searchCommandPalette("   ");
    expect(results).toEqual([]);
  });

  test("finds a lead by its contact's name and returns display fields + match reasons", async () => {
    await useServerActionSession(ownerSupabase);
    const results = await searchCommandPalette(`Cmdk Palette Target ${RUN_ID}`);

    const match = results.find((result) => result.leadId === leadId);
    expect(match).toBeDefined();
    expect(match?.title).toBe(`Palette test lead ${RUN_ID}`);
    expect(match?.contactName).toBe(`Cmdk Palette Target ${RUN_ID}`);
    expect(match?.matchReasons.length).toBeGreaterThan(0);
  });

  test("does not return another account's leads", async () => {
    const otherOwnerId = await createConfirmedUser("other");
    try {
      const otherSupabase = await signInAs(otherOwnerId);
      await useServerActionSession(otherSupabase);

      const results = await searchCommandPalette(`Cmdk Palette Target ${RUN_ID}`);
      expect(results.find((result) => result.leadId === leadId)).toBeUndefined();
    } finally {
      await admin.auth.admin.deleteUser(otherOwnerId);
    }
  });
});
