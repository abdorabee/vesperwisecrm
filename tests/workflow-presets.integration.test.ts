// Seeds a workspace, runs the automation cron twice, and checks the two
// presets plus the fire-once guard. Requires Supabase and the dev server.
import { afterAll, describe, expect, test } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import type { Database } from "../src/lib/supabase/types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRON_SECRET = process.env.CRON_SECRET;
const APP_BASE_URL = process.env.SMOKE_TEST_BASE_URL || "http://localhost:3000";
const enabled = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY && CRON_SECRET);

const UNTOUCHED = "Untouched 4 days in Negotiation, then notify the manager and reassign";
const NURTURE = "Nurture for 90 days, then move back and re-enroll";
const password = ["A", "a", "1", "!"].join("") + randomBytes(18).toString("base64url");
const runId = Date.now();

describe.skipIf(!enabled)("phase 7 workflow presets", () => {
  const admin = createClient<Database>(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  let userId = "";
  let accountId = "";

  afterAll(async () => {
    if (accountId) {
      await admin.from("accounts").delete().eq("id", accountId);
    }
    if (userId) {
      await admin.auth.admin.deleteUser(userId);
    }
  });

  test("fires the negotiation and nurture presets once", async () => {
    const email = `phase7-${runId}@vesperwisecrm.test`;
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { niche: "wholesaler", account_name: "Phase 7" },
    });
    expect(createError).toBeNull();
    userId = created.user?.id ?? "";
    expect(userId).toBeTruthy();

    const { data: membership, error: memberError } = await admin
      .from("account_members")
      .select("account_id")
      .eq("user_id", userId)
      .single();
    expect(memberError).toBeNull();
    accountId = membership?.account_id ?? "";

    const { data: workflows, error: workflowError } = await admin
      .from("workflows")
      .select("id, name, trigger_type, trigger_config, workflow_actions(action_type, action_config, step_number)")
      .eq("account_id", accountId);
    expect(workflowError).toBeNull();

    const untouched = workflows?.find((workflow) => workflow.name === UNTOUCHED);
    const nurture = workflows?.find((workflow) => workflow.name === NURTURE);
    expect(untouched?.trigger_type).toBe("no_activity_days");
    expect(nurture?.trigger_type).toBe("no_activity_days");
    expect(untouched?.workflow_actions.map((action) => action.action_type).sort()).toEqual([
      "notify_user",
      "reassign",
    ]);
    expect(nurture?.workflow_actions.map((action) => action.action_type).sort()).toEqual([
      "change_stage",
      "enroll_sequence",
    ]);

    const { data: stages, error: stageError } = await admin
      .from("pipeline_stages")
      .select("id, name, display_order")
      .eq("account_id", accountId);
    expect(stageError).toBeNull();
    const negotiating = stages?.find((stage) => stage.name.toLowerCase().startsWith("negotiat"));
    const qualified = stages?.find((stage) => stage.name === "Qualified");
    const firstStage = [...(stages ?? [])].sort((a, b) => a.display_order - b.display_order)[0];
    expect(negotiating?.id).toBe(
      (untouched?.trigger_config as { stageId?: string } | null)?.stageId,
    );
    expect(qualified?.id).toBeTruthy();
    expect(firstStage?.id).toBeTruthy();

    const { data: contact, error: contactError } = await admin
      .from("contacts")
      .insert({ account_id: accountId, first_name: "Nora", email: `nora-${runId}@example.com` })
      .select("id")
      .single();
    expect(contactError).toBeNull();

    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const ninetyOneDaysAgo = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000).toISOString();

    const { data: quietDeal, error: quietError } = await admin
      .from("leads")
      .insert({
        account_id: accountId,
        contact_id: contact!.id,
        pipeline_stage_id: negotiating!.id,
        title: "Quiet negotiation",
        status: "open",
        owner_user_id: userId,
        created_at: fiveDaysAgo,
      })
      .select("id")
      .single();
    expect(quietError).toBeNull();

    const { data: nurtureLead, error: nurtureLeadError } = await admin
      .from("leads")
      .insert({
        account_id: accountId,
        contact_id: contact!.id,
        pipeline_stage_id: qualified!.id,
        title: "Long nurture",
        status: "open",
        owner_user_id: userId,
        created_at: ninetyOneDaysAgo,
      })
      .select("id")
      .single();
    expect(nurtureLeadError).toBeNull();

    const { data: group, error: groupError } = await admin
      .from("lead_groups")
      .insert({ account_id: accountId, name: "Desk" })
      .select("id")
      .single();
    expect(groupError).toBeNull();
    const { error: memberInsertError } = await admin.from("lead_group_members").insert({
      account_id: accountId,
      group_id: group!.id,
      user_id: userId,
      weight: 1,
    });
    expect(memberInsertError).toBeNull();
    const { error: robinError } = await admin.rpc("assign_lead_round_robin", {
      p_lead_id: quietDeal!.id,
      p_group_id: group!.id,
    });
    expect(robinError).toBeNull();
    await admin.from("activities").delete().eq("lead_id", quietDeal!.id);

    await admin
      .from("workflows")
      .update({ is_active: false })
      .eq("account_id", accountId)
      .eq("name", "Flag stale leads");

    async function runCron() {
      const response = await fetch(`${APP_BASE_URL}/api/cron/process-automation`, {
        headers: { Authorization: `Bearer ${CRON_SECRET}` },
      });
      const body = await response.json();
      expect(response.status, JSON.stringify(body)).toBe(200);
      return body;
    }

    await runCron();
    await runCron();

    const { data: quietLead } = await admin
      .from("leads")
      .select("owner_user_id")
      .eq("id", quietDeal!.id)
      .single();
    expect(quietLead?.owner_user_id).toBe(userId);

    const { data: quietRuns } = await admin
      .from("activities")
      .select("payload")
      .eq("lead_id", quietDeal!.id)
      .eq("type", "workflow_triggered");
    const untouchedRuns = (quietRuns ?? []).filter((row) => {
      const payload = row.payload as { workflow_id?: string; status?: string };
      return payload.workflow_id === untouched?.id;
    });
    expect(untouchedRuns.map((row) => (row.payload as { status?: string }).status)).toEqual([
      "success",
    ]);

    const { data: notices } = await admin
      .from("activities")
      .select("id")
      .eq("lead_id", quietDeal!.id)
      .eq("type", "user_notified");
    expect(notices?.length).toBe(1);

    const { data: moved } = await admin
      .from("leads")
      .select("pipeline_stage_id")
      .eq("id", nurtureLead!.id)
      .single();
    expect(moved?.pipeline_stage_id).toBe(firstStage?.id);

    const { data: enrollments } = await admin
      .from("lead_sequence_enrollments")
      .select("id, status")
      .eq("lead_id", nurtureLead!.id)
      .eq("status", "active");
    expect(enrollments).toHaveLength(1);

    const { data: fires } = await admin
      .from("workflow_lead_fires")
      .select("workflow_id")
      .eq("lead_id", quietDeal!.id);
    expect(fires?.some((fire) => fire.workflow_id === untouched?.id)).toBe(true);
  }, 90_000);
});
