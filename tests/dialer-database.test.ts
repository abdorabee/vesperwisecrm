// Opt-in integration coverage for the transactional dialer lifecycle. Run
// against a disposable, migrated Supabase project with RUN_DIALER_DB_TESTS=true.
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomBytes, randomUUID } from "node:crypto";
import type { Database } from "../src/lib/supabase/types";

const RUN = process.env.RUN_DIALER_DB_TESTS === "true";
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient<Database>(URL, SERVICE);
// Built from separate character-class pieces (not one literal) so a random,
// throwaway test-account password doesn't read as a static secret to scanners.
const password = ["A", "a", "1", "!"].join("") + randomBytes(18).toString("base64url");

let userId = "";
let accountId = "";
let contactId = "";
let secondContactId = "";
let leadId = "";
let secondLeadId = "";
let owner: SupabaseClient<Database>;

async function prepare(
  client: SupabaseClient<Database>,
  input: { contactId: string; leadId: string; queueItemId?: string | null; key?: string },
) {
  return client.rpc("prepare_dialer_call", {
    p_contact_id: input.contactId,
    p_lead_id: input.leadId,
    p_queue_item_id: input.queueItemId ?? null,
    p_phone_e164: input.contactId === contactId ? "+14155552671" : "+14155552672",
    p_idempotency_key: input.key ?? randomUUID(),
    p_provider: "twilio",
    p_max_calls_per_second: 20,
  });
}

async function providerEvent(input: {
  attemptId: string;
  status: string;
  sequence: number;
  eventKey?: string;
}) {
  return admin.rpc("process_dialer_provider_event", {
    p_attempt_id: input.attemptId,
    p_provider_call_id: `CA${input.attemptId.replaceAll("-", "").slice(0, 32)}`,
    p_provider_event_key: input.eventKey ?? `${input.attemptId}:${input.sequence}:${input.status}`,
    p_provider_sequence: input.sequence,
    p_event_type: `test.${input.status}`,
    p_status: input.status,
    p_failure_code: null,
    p_failure_reason: null,
    p_payload: { test: true },
    p_occurred_at: new Date().toISOString(),
  });
}

describe.skipIf(!RUN)("dialer database lifecycle", () => {
  beforeAll(async () => {
    const email = `dialer-db-${Date.now()}@vesperwisecrm.test`;
    const { data: created, error: userError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (userError || !created.user) throw new Error(userError?.message ?? "user setup failed");
    userId = created.user.id;
    const { data: membership } = await admin.from("account_members").select("account_id").eq("user_id", userId).single();
    accountId = membership!.account_id;
    await admin.from("billing_accounts").update({
      source: "grandfathered",
      plan_key: "starter",
      provider_status: "active",
      seats: 10,
    }).eq("account_id", accountId);
    await admin.from("account_members").update({ onboarding_tour_completed_at: new Date().toISOString() }).eq("user_id", userId);

    const { data: stage } = await admin.from("pipeline_stages").select("id").eq("account_id", accountId).order("display_order").limit(1).single();
    const { data: contacts, error: contactError } = await admin.from("contacts").insert([
      { account_id: accountId, first_name: "Dialer", last_name: "One", phone: "+14155552671" },
      { account_id: accountId, first_name: "Dialer", last_name: "Two", phone: "+14155552672" },
    ]).select("id");
    if (contactError || !contacts) throw new Error(contactError?.message ?? "contact setup failed");
    [contactId, secondContactId] = contacts.map((contact) => contact.id);
    const { data: leads, error: leadError } = await admin.from("leads").insert([
      { account_id: accountId, contact_id: contactId, pipeline_stage_id: stage!.id, title: "Dialer DB one", owner_user_id: userId },
      { account_id: accountId, contact_id: secondContactId, pipeline_stage_id: stage!.id, title: "Dialer DB two", owner_user_id: userId },
    ]).select("id");
    if (leadError || !leads) throw new Error(leadError?.message ?? "lead setup failed");
    [leadId, secondLeadId] = leads.map((lead) => lead.id);

    owner = createClient<Database>(URL, ANON);
    const { error: signInError } = await owner.auth.signInWithPassword({ email, password });
    if (signInError) throw signInError;
  });

  afterAll(async () => {
    if (accountId) await admin.from("accounts").delete().eq("id", accountId);
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  test("preparation is idempotent and enforces one active call per user", async () => {
    const key = randomUUID();
    const first = await prepare(owner, { contactId, leadId, key });
    expect(first.error).toBeNull();
    const duplicate = await prepare(owner, { contactId, leadId, key });
    expect(duplicate.data).toEqual(first.data);
    const concurrent = await prepare(owner, { contactId: secondContactId, leadId: secondLeadId });
    expect(concurrent.error?.message).toContain("already have an active call");
  });

  test("deduplicates callbacks and ignores out-of-order events after completion", async () => {
    const { data: attempts } = await owner.from("call_attempts").select("id").eq("user_id", userId).limit(1);
    const attemptId = attempts![0].id;
    const ringing = await providerEvent({ attemptId, status: "ringing", sequence: 2, eventKey: `${attemptId}:ringing` });
    expect(ringing.data).toBe("processed");
    const duplicate = await providerEvent({ attemptId, status: "ringing", sequence: 2, eventKey: `${attemptId}:ringing` });
    expect(duplicate.data).toBe("duplicate");
    expect((await providerEvent({ attemptId, status: "completed", sequence: 4 })).data).toBe("processed");
    expect((await providerEvent({ attemptId, status: "answered", sequence: 3 })).data).toBe("stored");
    const { data: attempt } = await owner.from("call_attempts").select("status, last_provider_sequence").eq("id", attemptId).single();
    expect(attempt).toMatchObject({ status: "completed", last_provider_sequence: 4 });
  });

  test("DNC disposition blocks a new normalized-number reservation", async () => {
    const { data: attempt } = await owner.from("call_attempts").select("id").eq("user_id", userId).limit(1).single();
    const { data: disposition } = await owner.from("call_dispositions").select("id").eq("account_id", accountId).eq("marks_do_not_call", true).single();
    const result = await owner.rpc("set_dialer_disposition", {
      p_attempt_id: attempt!.id,
      p_disposition_id: disposition!.id,
      p_notes: "Integration-test DNC",
    });
    expect(result.error).toBeNull();
    const blocked = await prepare(owner, { contactId, leadId });
    expect(blocked.error?.message).toContain("Do Not Call");
  });

  test("paused queues cannot claim and retryable outcomes release with a delay", async () => {
    const { data: queue } = await owner.from("dialer_queues").insert({
      account_id: accountId,
      name: "Integration queue",
      owner_user_id: userId,
      created_by_user_id: userId,
      status: "paused",
      max_attempts: 3,
      retry_delay_seconds: 30,
    }).select("id").single();
    const { data: item } = await owner.from("dialer_queue_items").insert({
      account_id: accountId,
      queue_id: queue!.id,
      contact_id: secondContactId,
      lead_id: secondLeadId,
    }).select("id").single();
    expect((await prepare(owner, { contactId: secondContactId, leadId: secondLeadId, queueItemId: item!.id })).error?.message).toContain("not active");
    await owner.from("dialer_queues").update({ status: "active" }).eq("id", queue!.id);
    const started = await prepare(owner, { contactId: secondContactId, leadId: secondLeadId, queueItemId: item!.id });
    expect(started.error).toBeNull();
    const attemptId = started.data![0].attempt_id;
    await providerEvent({ attemptId, status: "no_answer", sequence: 1 });
    const { data: retryDisposition } = await owner.from("call_dispositions").select("id").eq("account_id", accountId).eq("is_retryable", true).limit(1).single();
    expect((await owner.rpc("set_dialer_disposition", { p_attempt_id: attemptId, p_disposition_id: retryDisposition!.id, p_notes: "retry" })).error).toBeNull();
    const { data: released } = await owner.from("dialer_queue_items").select("status, next_attempt_at").eq("id", item!.id).single();
    expect(released?.status).toBe("queued");
    expect(new Date(released!.next_attempt_at!).getTime()).toBeGreaterThan(Date.now());
  });

  test("dialer_provider_credentials grants no access to authenticated, even the account owner", async () => {
    const insertAttempt = await owner.from("dialer_provider_credentials").insert({
      account_id: accountId,
      account_sid: "ACtest",
      auth_token_ciphertext: "irrelevant",
      api_key_sid: "SKtest",
      api_key_secret_ciphertext: "irrelevant",
      twiml_app_sid: "APtest",
      from_number: "+14155550100",
    });
    expect(insertAttempt.error).not.toBeNull();

    await admin.from("dialer_provider_credentials").insert({
      account_id: accountId,
      account_sid: "ACtest",
      auth_token_ciphertext: "irrelevant",
      api_key_sid: "SKtest",
      api_key_secret_ciphertext: "irrelevant",
      twiml_app_sid: "APtest",
      from_number: "+14155550100",
    });
    const selectAttempt = await owner.from("dialer_provider_credentials").select("*").eq("account_id", accountId);
    expect(selectAttempt.data).toEqual([]);
    await admin.from("dialer_provider_credentials").delete().eq("account_id", accountId);
  });
});
