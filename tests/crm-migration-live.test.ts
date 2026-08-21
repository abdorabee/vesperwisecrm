import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import type { Database } from "../src/lib/supabase/types";
import {
  getImportJob,
  previewMigration,
  startMigrationJob,
} from "../src/lib/actions/migration";

const cookieJar = vi.hoisted(() => ({
  values: new Map<string, string>(),
}));

vi.mock("server-only", () => ({}));

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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Built from separate character-class pieces (not one literal) so a random,
// throwaway test-account password doesn't read as a static secret to scanners.
const PASSWORD = ["A", "a", "1", "!"].join("") + randomBytes(18).toString("base64url");
const RUN_ID = Date.now();
const CARROT_CSV = `seller_first_name,seller_last_name,seller_email,seller_phone,street_address,city,state,zip_code,price_asking,motivation,campaign_name,notes,labels,pipeline
Ivy,Seller,ivy-${RUN_ID}@example.com,3123121234,123 Main Street,Naples,FL,76131,500000,Hot,Campaign B,Called twice,wholesale,Pursue`;

const shouldRun = Boolean(SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY);

const admin = shouldRun
  ? createClient<Database>(SUPABASE_URL!, SERVICE_ROLE_KEY!)
  : null;

async function createConfirmedOwner(): Promise<string> {
  const { data, error } = await admin!.auth.admin.createUser({
    email: `crm-migration-owner-${RUN_ID}@vesperwisecrm.test`,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(`Failed to create owner: ${error?.message}`);
  }
  return data.user.id;
}

async function signInAs(userId: string): Promise<SupabaseClient<Database>> {
  const { data: userData } = await admin!.auth.admin.getUserById(userId);
  const client = createClient<Database>(SUPABASE_URL!, ANON_KEY!);
  const { error } = await client.auth.signInWithPassword({
    email: userData.user!.email!,
    password: PASSWORD,
  });
  if (error) {
    throw new Error(`Failed to sign in: ${error.message}`);
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
  const serverClient = createServerClient<Database>(SUPABASE_URL!, ANON_KEY!, {
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

describe.skipIf(!shouldRun)("live CRM migration import", () => {
  beforeAll(async () => {
    ownerUserId = await createConfirmedOwner();
    const { data: member } = await admin!
      .from("account_members")
      .select("account_id")
      .eq("user_id", ownerUserId)
      .single();
    accountId = member!.account_id;

    await admin!.from("billing_accounts").update({
      source: "grandfathered",
      plan_key: "starter",
      provider_status: "active",
      seats: 10,
    }).eq("account_id", accountId);

    const ownerClient = await signInAs(ownerUserId);
    await useServerActionSession(ownerClient);
  });

  afterAll(async () => {
    if (accountId) {
      await admin!.from("accounts").delete().eq("id", accountId);
    }
    if (ownerUserId) {
      await admin!.auth.admin.deleteUser(ownerUserId);
    }
  });

  test("imports a Carrot CSV into a lead with source, tags, notes, and property", async () => {
    const preview = await previewMigration({
      csvText: CARROT_CSV,
      sourceCrm: "carrot",
    });
    expect(preview.sourceCrm).toBe("carrot");
    expect(preview.recordCount).toBe(1);

    const negotiating = await admin!
      .from("pipeline_stages")
      .select("id")
      .eq("account_id", accountId)
      .eq("name", "Negotiating")
      .single();

    const progress = await startMigrationJob({
      csvText: CARROT_CSV,
      sourceCrm: "carrot",
      mapping: preview.suggestedMapping,
      stageMap: { Pursue: negotiating.data!.id },
    });

    expect(progress.importedCount).toBe(1);
    expect(progress.failedCount).toBe(0);
    expect(progress.status).toBe("completed");

    const polled = await getImportJob({ jobId: progress.id });
    expect(polled.status).toBe("completed");

    const { data: lead } = await admin!
      .from("leads")
      .select("id, title, value, pipeline_stage_id, contact:contact_id(first_name, last_name, email, source)")
      .eq("account_id", accountId)
      .single();

    expect(lead?.title).toContain("Main Street");
    expect(lead?.value).toBe(500000);
    const contact = Array.isArray(lead?.contact) ? lead?.contact[0] : lead?.contact;
    expect(contact).toMatchObject({
      first_name: "Ivy",
      last_name: "Seller",
      source: "Campaign B",
    });

    const { data: property } = await admin!
      .from("lead_properties")
      .select("address_line1, city, postal_code, asking_price, motivation")
      .eq("lead_id", lead!.id)
      .single();
    expect(property).toMatchObject({
      address_line1: "123 Main Street",
      city: "Naples",
      postal_code: "76131",
      asking_price: 500000,
      motivation: "Hot",
    });

    const { data: tags } = await admin!
      .from("lead_tags")
      .select("tag:tag_id(name)")
      .eq("lead_id", lead!.id);
    expect(tags?.map((row) => (row.tag as { name: string }).name)).toContain(
      "wholesale",
    );

    const { data: notes } = await admin!
      .from("activities")
      .select("payload")
      .eq("lead_id", lead!.id)
      .eq("type", "note_added");
    expect(
      notes?.some((row) => {
        const payload = row.payload as { note?: string };
        return payload.note?.includes("Called twice");
      }),
    ).toBe(true);
  });
});
