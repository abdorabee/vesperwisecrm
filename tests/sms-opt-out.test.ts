// Integration coverage for SMS suppression (contacts.sms_opted_out_at):
// inbound STOP-keyword handling (src/lib/sms/process-inbound.ts) and
// send-time enforcement (src/lib/sequences/send-step.ts). Runs against
// the live Supabase project using real throwaway rows, cleaned up in
// afterAll -- see docs/progress/quick-wins.md for why this didn't exist
// until the sms_opted_out_at migration was applied (2026-08-04).
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import type { Database } from "../src/lib/supabase/types";
import { processInboundSms } from "../src/lib/sms/process-inbound";
import { sendDueStep } from "../src/lib/sequences/send-step";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PASSWORD = `Aa1!${randomBytes(18).toString("base64url")}`;
const RUN_ID = Date.now();

const admin = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY);

async function createConfirmedUser(label: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: `sms-opt-out-${label}-${RUN_ID}@vesperwisecrm.test`,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(`Failed to create ${label}: ${error?.message}`);
  }
  return data.user.id;
}

function testPhone(offset: number): string {
  // Distinct, run-scoped last-10-digits so inbound phone matching never
  // collides with another test's contacts on the shared project.
  return `+1555${(RUN_ID + offset).toString().slice(-7)}`;
}

let ownerUserId: string;
let accountId: string;
let stageId: string;

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
});

afterAll(async () => {
  if (accountId) {
    await admin.from("lead_sequence_enrollments").delete().eq("account_id", accountId);
    await admin.from("sequence_steps").delete().eq("account_id", accountId);
    await admin.from("sequences").delete().eq("account_id", accountId);
    await admin.from("activities").delete().eq("account_id", accountId);
    await admin.from("leads").delete().eq("account_id", accountId);
    await admin.from("contacts").delete().eq("account_id", accountId);
    await admin.from("accounts").delete().eq("id", accountId);
  }
  if (ownerUserId) {
    await admin.auth.admin.deleteUser(ownerUserId);
  }
});

describe("inbound SMS STOP handling", () => {
  test("a STOP reply sets sms_opted_out_at and is flagged on the activity", async () => {
    const phone = testPhone(0);
    const { data: contact } = await admin
      .from("contacts")
      .insert({ account_id: accountId, first_name: "Stop Test", phone })
      .select("id")
      .single();

    const { data: lead } = await admin
      .from("leads")
      .insert({
        account_id: accountId,
        contact_id: contact!.id,
        pipeline_stage_id: stageId,
        title: "STOP test lead",
      })
      .select("id")
      .single();

    const result = await processInboundSms({
      from: phone,
      to: "+15005550006",
      body: "STOP",
      messageSid: `SM-stop-${RUN_ID}`,
    });

    expect(result.status).toBe("processed");

    const { data: updatedContact } = await admin
      .from("contacts")
      .select("sms_opted_out_at")
      .eq("id", contact!.id)
      .single();
    expect(updatedContact?.sms_opted_out_at).not.toBeNull();

    const { data: activity } = await admin
      .from("activities")
      .select("payload")
      .eq("lead_id", lead!.id)
      .eq("type", "sms_received")
      .single();
    expect((activity?.payload as { opted_out?: boolean } | null)?.opted_out).toBe(
      true,
    );
  });

  test("a normal reply does not set sms_opted_out_at", async () => {
    const phone = testPhone(1);
    const { data: contact } = await admin
      .from("contacts")
      .insert({ account_id: accountId, first_name: "Normal Test", phone })
      .select("id")
      .single();

    await admin.from("leads").insert({
      account_id: accountId,
      contact_id: contact!.id,
      pipeline_stage_id: stageId,
      title: "Normal reply test lead",
    });

    const result = await processInboundSms({
      from: phone,
      to: "+15005550006",
      body: "Yes, that works for me!",
      messageSid: `SM-normal-${RUN_ID}`,
    });

    expect(result.status).toBe("processed");

    const { data: updatedContact } = await admin
      .from("contacts")
      .select("sms_opted_out_at")
      .eq("id", contact!.id)
      .single();
    expect(updatedContact?.sms_opted_out_at).toBeNull();
  });
});

describe("send-step SMS suppression", () => {
  test("sendDueStep skips and cancels the enrollment when the contact opted out, even on a non-marketing sequence", async () => {
    const phone = testPhone(2);
    const { data: contact } = await admin
      .from("contacts")
      .insert({
        account_id: accountId,
        first_name: "Opted Out",
        phone,
        sms_opted_out_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    const { data: lead } = await admin
      .from("leads")
      .insert({
        account_id: accountId,
        contact_id: contact!.id,
        pipeline_stage_id: stageId,
        title: "Opted-out send-step test lead",
      })
      .select("id")
      .single();

    const { data: sequence } = await admin
      .from("sequences")
      .insert({
        account_id: accountId,
        name: "SMS suppression test sequence",
        // Deliberately non-marketing: unlike email opt-out (which only
        // blocks marketing sequences), SMS STOP must suppress every send.
        is_marketing: false,
      })
      .select("id")
      .single();

    await admin.from("sequence_steps").insert({
      account_id: accountId,
      sequence_id: sequence!.id,
      step_number: 1,
      channel: "sms",
      body_template: "Hi {{first_name}}, following up.",
    });

    const { data: enrollment } = await admin
      .from("lead_sequence_enrollments")
      .insert({
        account_id: accountId,
        lead_id: lead!.id,
        sequence_id: sequence!.id,
        current_step_number: 1,
        status: "active",
      })
      .select("id")
      .single();

    const result = await sendDueStep(admin, enrollment!.id, null);
    expect(result.completed).toBe(true);

    const { data: updatedEnrollment } = await admin
      .from("lead_sequence_enrollments")
      .select("status")
      .eq("id", enrollment!.id)
      .single();
    expect(updatedEnrollment?.status).toBe("cancelled");

    const { data: activities } = await admin
      .from("activities")
      .select("payload")
      .eq("lead_id", lead!.id)
      .eq("type", "sequence_step_sent");
    const skipped = (activities ?? []).find(
      (activity) =>
        (activity.payload as { reason?: string } | null)?.reason ===
        "contact_opted_out",
    );
    expect(skipped).toBeDefined();
  });
});
