// RLS audit: verifies the security boundaries that matter most --
// cross-account isolation, assigned_only visibility, and client-role
// scoping (clients must never see seller PII or leads outside their own
// assignment). Runs against the live Supabase project using real
// short-lived auth users, cleaned up in afterAll.
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import type { Database } from "../src/lib/supabase/types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
// Generated per run, not hardcoded: these are throwaway test accounts
// deleted in afterAll, but a fixed literal is still a bad habit to commit.
const PASSWORD = `Aa1!${randomBytes(18).toString("base64url")}`;
const RUN_ID = Date.now();

const admin = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY);

async function createConfirmedUser(
  label: string,
  userMetadata?: Record<string, string>,
): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: `rls-audit-${label}-${RUN_ID}@vesperwisecrm.test`,
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
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) {
    throw new Error(`Failed to sign in ${email}: ${error.message}`);
  }
  return client;
}

let accountAOwnerId: string;
let accountARestrictedId: string;
let accountBOwnerId: string;
let clientUserId: string;

let accountAId: string;
let accountBId: string;
let investorClientId: string;

let leadOwnedByRestricted: string;
let leadOwnedByOwner: string;
let leadAssignedToClient: string;
let leadInAccountB: string;

let ownerSupabase: SupabaseClient<Database>;
let restrictedSupabase: SupabaseClient<Database>;
let otherAccountSupabase: SupabaseClient<Database>;
let clientSupabase: SupabaseClient<Database>;

beforeAll(async () => {
  // Real signups (owners) each get their own auto-provisioned account --
  // that part of handle_new_user() is intentional and out of scope here.
  accountAOwnerId = await createConfirmedUser("owner-a");
  accountBOwnerId = await createConfirmedUser("owner-b");

  const { data: memberA } = await admin
    .from("account_members")
    .select("account_id")
    .eq("user_id", accountAOwnerId)
    .single();
  accountAId = memberA!.account_id;

  const { data: memberB } = await admin
    .from("account_members")
    .select("account_id")
    .eq("user_id", accountBOwnerId)
    .single();
  accountBId = memberB!.account_id;

  const { data: client } = await admin
    .from("clients")
    .insert({ account_id: accountAId, name: "RLS Audit Investor" })
    .select("id")
    .single();
  investorClientId = client!.id;

  // Restricted member and client user are created via the same
  // invited_account_id metadata path the real invite flow uses, so the
  // signup trigger joins them into account A directly instead of also
  // auto-provisioning a personal account for each of them.
  accountARestrictedId = await createConfirmedUser("restricted-a", {
    invited_account_id: accountAId,
    invited_role: "member",
  });
  await admin
    .from("account_members")
    .update({ lead_visibility: "assigned_only" })
    .eq("account_id", accountAId)
    .eq("user_id", accountARestrictedId);

  clientUserId = await createConfirmedUser("client", {
    invited_account_id: accountAId,
    invited_role: "client",
    invited_client_id: investorClientId,
  });

  const { data: stage } = await admin
    .from("pipeline_stages")
    .select("id")
    .eq("account_id", accountAId)
    .order("display_order")
    .limit(1)
    .single();

  const { data: stageB } = await admin
    .from("pipeline_stages")
    .select("id")
    .eq("account_id", accountBId)
    .order("display_order")
    .limit(1)
    .single();

  const { data: contact1 } = await admin
    .from("contacts")
    .insert({ account_id: accountAId, first_name: "Restricted Seller" })
    .select("id")
    .single();
  const { data: contact2 } = await admin
    .from("contacts")
    .insert({ account_id: accountAId, first_name: "Owner Seller" })
    .select("id")
    .single();
  const { data: contact3 } = await admin
    .from("contacts")
    .insert({ account_id: accountAId, first_name: "Client Seller" })
    .select("id")
    .single();
  const { data: contactB } = await admin
    .from("contacts")
    .insert({ account_id: accountBId, first_name: "Account B Seller" })
    .select("id")
    .single();

  const { data: leadRestricted } = await admin
    .from("leads")
    .insert({
      account_id: accountAId,
      contact_id: contact1!.id,
      pipeline_stage_id: stage!.id,
      title: "Restricted-owned lead",
      owner_user_id: accountARestrictedId,
    })
    .select("id")
    .single();
  leadOwnedByRestricted = leadRestricted!.id;

  const { data: leadOwner } = await admin
    .from("leads")
    .insert({
      account_id: accountAId,
      contact_id: contact2!.id,
      pipeline_stage_id: stage!.id,
      title: "Owner-owned lead",
      owner_user_id: accountAOwnerId,
    })
    .select("id")
    .single();
  leadOwnedByOwner = leadOwner!.id;

  const { data: leadClient } = await admin
    .from("leads")
    .insert({
      account_id: accountAId,
      contact_id: contact3!.id,
      pipeline_stage_id: stage!.id,
      title: "Client-assigned lead",
      client_id: investorClientId,
      client_interest_status: "pending",
    })
    .select("id")
    .single();
  leadAssignedToClient = leadClient!.id;

  const { data: leadB } = await admin
    .from("leads")
    .insert({
      account_id: accountBId,
      contact_id: contactB!.id,
      pipeline_stage_id: stageB!.id,
      title: "Account B lead",
    })
    .select("id")
    .single();
  leadInAccountB = leadB!.id;

  ownerSupabase = await signInAs(accountAOwnerId);
  restrictedSupabase = await signInAs(accountARestrictedId);
  otherAccountSupabase = await signInAs(accountBOwnerId);
  clientSupabase = await signInAs(clientUserId);
});

afterAll(async () => {
  await admin.from("leads").delete().eq("account_id", accountAId);
  await admin.from("leads").delete().eq("account_id", accountBId);
  await admin.from("contacts").delete().eq("account_id", accountAId);
  await admin.from("contacts").delete().eq("account_id", accountBId);
  await admin.from("clients").delete().eq("id", investorClientId);
  await admin.from("accounts").delete().eq("id", accountAId);
  await admin.from("accounts").delete().eq("id", accountBId);

  for (const id of [accountAOwnerId, accountARestrictedId, accountBOwnerId, clientUserId]) {
    await admin.auth.admin.deleteUser(id);
  }
});

describe("assigned_only lead visibility", () => {
  test("restricted member sees only their own leads", async () => {
    const { data } = await restrictedSupabase.from("leads").select("id");
    const ids = (data ?? []).map((l) => l.id);
    expect(ids).toContain(leadOwnedByRestricted);
    expect(ids).not.toContain(leadOwnedByOwner);
    expect(ids).not.toContain(leadAssignedToClient);
  });

  test("unrestricted owner sees every lead in their account", async () => {
    const { data } = await ownerSupabase.from("leads").select("id");
    const ids = (data ?? []).map((l) => l.id);
    expect(ids).toContain(leadOwnedByRestricted);
    expect(ids).toContain(leadOwnedByOwner);
    expect(ids).toContain(leadAssignedToClient);
  });
});

describe("cross-account isolation", () => {
  test("account B owner cannot see account A leads", async () => {
    const { data } = await otherAccountSupabase.from("leads").select("id");
    const ids = (data ?? []).map((l) => l.id);
    expect(ids).toContain(leadInAccountB);
    expect(ids).not.toContain(leadOwnedByRestricted);
    expect(ids).not.toContain(leadOwnedByOwner);
    expect(ids).not.toContain(leadAssignedToClient);
  });
});

describe("client-role scoping", () => {
  test("client sees only their assigned lead, nothing else", async () => {
    const { data } = await clientSupabase.from("leads").select("id");
    const ids = (data ?? []).map((l) => l.id);
    expect(ids).toEqual([leadAssignedToClient]);
  });

  test("client cannot see any contacts (seller PII stays internal)", async () => {
    const { data } = await clientSupabase.from("contacts").select("id");
    expect(data ?? []).toEqual([]);
  });

  test("client cannot see lead_tasks, workflows, or other internal tables", async () => {
    const [{ data: tasks }, { data: workflows }, { data: sequences }] = await Promise.all([
      clientSupabase.from("lead_tasks").select("id"),
      clientSupabase.from("workflows").select("id"),
      clientSupabase.from("sequences").select("id"),
    ]);
    expect(tasks ?? []).toEqual([]);
    expect(workflows ?? []).toEqual([]);
    expect(sequences ?? []).toEqual([]);
  });

  test("client can see the property details for their assigned lead", async () => {
    const { error: insertError } = await admin.from("lead_properties").insert({
      account_id: accountAId,
      lead_id: leadAssignedToClient,
      asking_price: 195000,
    });
    expect(insertError).toBeNull();

    const { data } = await clientSupabase
      .from("lead_properties")
      .select("asking_price")
      .eq("lead_id", leadAssignedToClient);
    expect(data?.[0]?.asking_price).toBe(195000);
  });

  test("set_client_lead_interest updates only the client's own assigned lead", async () => {
    const { error: okError } = await clientSupabase.rpc("set_client_lead_interest", {
      p_lead_id: leadAssignedToClient,
      p_status: "interested",
    });
    expect(okError).toBeNull();

    const { data: updated } = await admin
      .from("leads")
      .select("client_interest_status")
      .eq("id", leadAssignedToClient)
      .single();
    expect(updated?.client_interest_status).toBe("interested");
  });

  test("set_client_lead_interest rejects a lead not assigned to the caller's client", async () => {
    const { error } = await clientSupabase.rpc("set_client_lead_interest", {
      p_lead_id: leadOwnedByOwner,
      p_status: "interested",
    });
    expect(error).not.toBeNull();
  });
});

describe("team roster excludes client logins", () => {
  test("get_account_member_profiles never returns client-role rows", async () => {
    const { data } = await ownerSupabase.rpc("get_account_member_profiles", {
      p_account_id: accountAId,
    });
    const roles = (data ?? []).map((m) => m.role);
    expect(roles).not.toContain("client");
  });
});
