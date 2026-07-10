// End-to-end coverage of AI lead scoring (INT-32): the score panel renders
// on the lead detail page, a stored score displays with its factor
// breakdown, and the score button fails cleanly when ANTHROPIC_API_KEY is
// not configured (or scores for real when it is). Creates and tears down
// its own throwaway account via the Supabase service role.
import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { randomBytes } from "node:crypto";

config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const AI_CONFIGURED = Boolean(process.env.ANTHROPIC_API_KEY);
const PASSWORD = `Aa1!${randomBytes(18).toString("base64url")}`;
const EMAIL = `e2e-scoring-${Date.now()}@vesperwisecrm.test`;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

let userId: string;
let accountId: string;
let leadId: string;

test.beforeAll(async () => {
  const { data, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(`Failed to create test user: ${error?.message}`);
  }
  userId = data.user.id;

  const { data: member } = await admin
    .from("account_members")
    .select("account_id")
    .eq("user_id", userId)
    .single();
  accountId = member!.account_id;

  // Skip the first-run onboarding tour overlay so it can't intercept clicks.
  await admin
    .from("account_members")
    .update({ onboarding_tour_completed_at: new Date().toISOString() })
    .eq("user_id", userId);

  const { data: stage } = await admin
    .from("pipeline_stages")
    .select("id")
    .eq("account_id", accountId)
    .order("display_order")
    .limit(1)
    .single();

  const { data: contact } = await admin
    .from("contacts")
    .insert({
      account_id: accountId,
      first_name: "Motivated",
      last_name: "Seller",
      phone: "+15550004444",
    })
    .select("id")
    .single();

  const { data: lead } = await admin
    .from("leads")
    .insert({
      account_id: accountId,
      contact_id: contact!.id,
      pipeline_stage_id: stage!.id,
      title: "AI scoring e2e lead",
      status: "open",
    })
    .select("id")
    .single();
  leadId = lead!.id;
});

test.afterAll(async () => {
  if (accountId) {
    await admin.from("activities").delete().eq("account_id", accountId);
    await admin.from("leads").delete().eq("account_id", accountId);
    await admin.from("contacts").delete().eq("account_id", accountId);
    await admin.from("accounts").delete().eq("id", accountId);
  }
  if (userId) {
    await admin.auth.admin.deleteUser(userId);
  }
});

async function login(page: Page): Promise<void> {
  await page.goto("/login");
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(/\/(pipeline)?$/, { timeout: 10_000 });
}

test("score panel renders, stored scores display, and scoring responds per AI config", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await login(page);

  // Unscored lead shows the score CTA and no badge.
  await page.goto(`/leads/${leadId}`);
  await expect(page.getByRole("button", { name: "Score with AI" })).toBeVisible();
  await expect(page.getByText(/\/100/)).not.toBeVisible();

  if (AI_CONFIGURED) {
    // Live path: real Claude call stores and displays a score.
    await page.getByRole("button", { name: "Score with AI" }).click();
    await expect(page.getByText(/\/100/)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: "Re-score" })).toBeVisible();
  } else {
    // Unconfigured path: clean, user-readable failure, no crash.
    await page.getByRole("button", { name: "Score with AI" }).click();
    await expect(
      page.getByText(/AI features aren't configured yet/),
    ).toBeVisible({ timeout: 15_000 });
  }

  // A stored score renders badge, summary, and factor breakdown on load.
  await admin
    .from("leads")
    .update({
      ai_score: 78,
      ai_score_factors: {
        summary: "Motivated seller with a clear timeline.",
        positives: ["Wants to close ASAP", "Recent roof replacement"],
        risks: ["Tenant occupied until next month"],
      },
      ai_scored_at: new Date().toISOString(),
    })
    .eq("id", leadId);

  await page.reload();
  await expect(page.getByText("Hot · 78/100")).toBeVisible();
  await expect(
    page.getByText("Motivated seller with a clear timeline."),
  ).toBeVisible();
  await expect(page.getByText("Wants to close ASAP")).toBeVisible();
  await expect(page.getByText("Tenant occupied until next month")).toBeVisible();
  await expect(page.getByRole("button", { name: "Re-score" })).toBeVisible();

  // The unconfigured scoring action intentionally responds 500 (the toast
  // above asserts the clean user-facing failure); every other console error
  // is a real defect.
  const unexpectedErrors = AI_CONFIGURED
    ? consoleErrors
    : consoleErrors.filter(
        (text) =>
          !text.includes(
            "Failed to load resource: the server responded with a status of 500",
          ),
      );
  expect(unexpectedErrors).toEqual([]);
});
